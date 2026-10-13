import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { addDays, type AppLocale, type Plan } from './shared/index.ts';
import { AnthropicProvider } from './ai/anthropic.ts';
import { MockProvider } from './ai/mock.ts';
import { loadConfig, type ServerConfig } from './config.ts';
import type { ServerDeps } from './deps.ts';
import { todayMealsLine, trainingSummaryLine } from './coachSummary.ts';
import type { RegionalRow } from './enrich.ts';

const EXPORT_TABLES = [
  'goals',
  'water_logs',
  'weight_logs',
  'body_measurements',
  'foods_custom',
  'recipes',
  'favorites',
  'recent_foods',
  'achievements',
  'streaks',
  'notification_settings',
  'usage_quotas',
  'subscriptions',
  'ai_feedback',
  'workouts',
  'supplements',
  'supplement_intakes',
] as const;

const PAGE = 1000;
const LIST_PAGE = 1000;

/** Reads every page of a query (PostgREST caps each response at `max_rows`). */
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = must(await page(from, from + PAGE - 1)) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Production dependencies: service-role Supabase client (bypasses RLS — server only). */
export function createDeps(config: ServerConfig = loadConfig((k) => Deno.env.get(k))): ServerDeps {
  const sb: SupabaseClient = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ai = config.aiMock
    ? new MockProvider()
    : new AnthropicProvider(config.anthropicApiKey, config.aiModelFree);

  return {
    config,
    ai,
    now: () => new Date(),
    fetch: (...args) => fetch(...args),
    async userFromToken(token) {
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    },
    async deleteAuthUser(userId) {
      const { error } = await sb.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },
    db: {
      async profile(userId) {
        const p = must(
          await sb
            .from('profiles')
            .select('timezone, locale, country, dietary_preferences, allergies, save_photos')
            .eq('id', userId)
            .maybeSingle(),
        );
        return {
          timezone: p?.timezone ?? 'America/Argentina/Buenos_Aires',
          locale: (p?.locale ?? 'es-AR') as AppLocale,
          country: p?.country ?? 'AR',
          dietaryPreferences: p?.dietary_preferences ?? [],
          allergies: p?.allergies ?? [],
          savePhotos: p?.save_photos ?? true,
        };
      },
      async plan(userId) {
        return must(await sb.rpc('plan_for', { p_user: userId })) as Plan;
      },
      async consumeQuota(userId, kind, day, dailyLimit, trialLimit) {
        const rows = must(
          await sb.rpc('consume_quota', {
            p_user: userId,
            p_kind: kind,
            p_day: day,
            p_daily_limit: dailyLimit,
            p_trial_limit: trialLimit,
          }),
        ) as { allowed: boolean; used: number; bucket: string | null }[];
        return rows[0] ?? { allowed: false, used: 0, bucket: null };
      },
      async refundQuota(userId, kind, day, bucket) {
        must(
          await sb.rpc('refund_quota', {
            p_user: userId,
            p_kind: kind,
            p_day: day,
            p_bucket: bucket ?? '',
          }),
        );
      },
      async quotaUsage(userId, day) {
        const r = must(
          await sb
            .from('usage_quotas')
            .select('photo_scans, text_queries, coach_messages')
            .eq('user_id', userId)
            .eq('day', day)
            .maybeSingle(),
        );
        return r ?? { photo_scans: 0, text_queries: 0, coach_messages: 0 };
      },
      async credits(userId) {
        const r = must(
          await sb
            .from('user_credits')
            .select('bonus_photo_scans, lifetime_coach_messages')
            .eq('user_id', userId)
            .maybeSingle(),
        );
        return r ?? { bonus_photo_scans: 0, lifetime_coach_messages: 0 };
      },
      async addBonusScans(userId, amount) {
        must(await sb.rpc('add_bonus_scans', { p_user: userId, p_amount: amount }));
      },
      async findScanByHash(userId, sha, kind, sinceIso) {
        const r = must(
          await sb
            .from('ai_scans')
            .select('id, result')
            .eq('user_id', userId)
            .eq('image_sha256', sha)
            .eq('kind', kind)
            .in('status', ['ok', 'not_food'])
            .gte('created_at', sinceIso)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        );
        return r && r.result ? { id: r.id, result: r.result } : null;
      },
      async insertScan(row) {
        return (must(await sb.from('ai_scans').insert(row).select('id').single()) as { id: string })
          .id;
      },
      async aiCostToday() {
        return Number(must(await sb.rpc('ai_cost_today')) ?? 0);
      },
      async rateLimit(bucket, max, windowSeconds) {
        return must(
          await sb.rpc('check_rate_limit', {
            p_bucket: bucket,
            p_max: max,
            p_window_seconds: windowSeconds,
          }),
        ) as boolean;
      },
      async searchRegional(query) {
        return must(await sb.rpc('search_regional_foods', { q: query, lim: 8 })) as RegionalRow[];
      },
      async cacheGet(source, key) {
        const r = must(
          await sb
            .from('food_cache')
            .select('payload, fetched_at')
            .eq('source', source)
            .eq('cache_key', key)
            .maybeSingle(),
        );
        return r ? { payload: r.payload, fetchedAt: r.fetched_at } : null;
      },
      async cacheSet(source, key, payload) {
        must(
          await sb
            .from('food_cache')
            .upsert({ source, cache_key: key, payload, fetched_at: new Date().toISOString() }),
        );
      },
      async audit(userId, event, metadata = {}) {
        must(await sb.from('audit_events').insert({ user_id: userId, event, metadata }));
      },
      async coachContext(userId, today) {
        const from = addDays(today, -6);
        const [meals, goal, weight, profile, workouts, supplements] = await Promise.all([
          sb
            .from('meals')
            .select('id, local_date, meal_type, kcal, protein_g, carbs_g, fat_g, fiber_g')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .gte('local_date', from)
            .lte('local_date', today),
          sb
            .from('goals')
            .select('kcal, protein_g, carbs_g, fat_g, fiber_g')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .lte('effective_from', today)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle(),
          sb
            .from('weight_logs')
            .select('weight_kg, local_date')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('local_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          sb
            .from('profiles')
            .select('goal_type, sex, activity_level')
            .eq('id', userId)
            .maybeSingle(),
          sb
            .from('workouts')
            .select('duration_min, kcal')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .gte('local_date', from)
            .lte('local_date', today),
          sb
            .from('supplements')
            .select('name')
            .eq('user_id', userId)
            .eq('active', true)
            .is('deleted_at', null)
            .order('name'),
        ]);
        const byDay = new Map<string, { kcal: number; p: number; c: number; f: number }>();
        for (const m of meals.data ?? []) {
          const d = byDay.get(m.local_date) ?? { kcal: 0, p: 0, c: 0, f: 0 };
          d.kcal += Number(m.kcal);
          d.p += Number(m.protein_g);
          d.c += Number(m.carbs_g);
          d.f += Number(m.fat_g);
          byDay.set(m.local_date, d);
        }
        const t = byDay.get(today) ?? { kcal: 0, p: 0, c: 0, f: 0 };
        const g = goal.data;
        // What was eaten today, by meal (names only, so the coach doesn't repeat it).
        const todayMeals = (meals.data ?? []).filter((m) => m.local_date === today);
        const { data: todayItems } = todayMeals.length
          ? await sb
              .from('meal_items')
              .select('meal_id, display_name')
              .eq('user_id', userId)
              .in(
                'meal_id',
                todayMeals.map((m) => m.id),
              )
              .limit(60)
          : { data: [] as { meal_id: string; display_name: string }[] };
        const lines = [
          `Goal: ${profile.data?.goal_type ?? 'unknown'}; activity ${profile.data?.activity_level ?? 'unknown'}.`,
          g
            ? `Daily targets: ${g.kcal} kcal, P ${g.protein_g} g, C ${g.carbs_g} g, F ${g.fat_g} g.`
            : 'No targets set.',
          `Today so far: ${Math.round(t.kcal)} kcal, P ${Math.round(t.p)} g, C ${Math.round(t.c)} g, F ${Math.round(t.f)} g.`,
          g
            ? `Left today: ${Math.round(g.kcal - t.kcal)} kcal, P ${Math.round(g.protein_g - t.p)} g, C ${Math.round(g.carbs_g - t.c)} g, F ${Math.round(g.fat_g - t.f)} g.`
            : '',
          todayMealsLine(todayMeals, todayItems ?? []),
          `Last 7 days logged: ${byDay.size} days; average ${byDay.size ? Math.round([...byDay.values()].reduce((s, d) => s + d.kcal, 0) / byDay.size) : 0} kcal/day.`,
          weight.data
            ? `Latest weight: ${weight.data.weight_kg} kg (${weight.data.local_date}).`
            : 'No weight logged.',
          trainingSummaryLine(workouts.data ?? [], supplements.data ?? []),
        ];
        return lines.filter(Boolean).join('\n');
      },
      async exportUserData(userId) {
        const out: Record<string, unknown> = {};
        out.profile = must(await sb.from('profiles').select('*').eq('id', userId).maybeSingle());
        // Paged: the API returns at most `max_rows` (1000) per request and the export must be whole.
        out.meals = await allRows((from, to) =>
          sb
            .from('meals')
            .select('*, meal_items(*)')
            .eq('user_id', userId)
            .order('eaten_at')
            .order('id')
            .range(from, to),
        );
        for (const t of EXPORT_TABLES)
          out[t] = await allRows((from, to) =>
            sb.from(t).select('*').eq('user_id', userId).order('id').range(from, to),
          );
        out.ai_scans = await allRows((from, to) =>
          sb
            .from('ai_scans')
            .select('id, kind, model, status, created_at, cost_usd')
            .eq('user_id', userId)
            .order('id')
            .range(from, to),
        );
        return out;
      },
      async userExists(userId) {
        const { data } = await sb.auth.admin.getUserById(userId);
        return !!data?.user;
      },
      async recordWebhookEvent(id, appUserId, type, payload) {
        const { error } = await sb
          .from('revenuecat_events')
          .insert({ id, app_user_id: appUserId, type, payload });
        if (error?.code === '23505') return false; // duplicate delivery
        if (error) throw new Error(error.message);
        return true;
      },
      async upsertSubscription(s) {
        // One statement that skips out-of-order (older) events: see apply_subscription_event.
        must(await sb.rpc('apply_subscription_event', { p: s }));
      },
      async transferSubscription(fromUser, toUser) {
        must(await sb.rpc('transfer_subscription', { p_from: fromUser, p_to: toUser }));
      },
      async forgetBillingEvents(userId) {
        // Webhook ids stay (idempotency); who and what is removed.
        must(
          await sb
            .from('revenuecat_events')
            .update({ app_user_id: null, payload: {} })
            .eq('app_user_id', userId),
        );
      },
    },
    storage: {
      async download(bucket, path) {
        const { data, error } = await sb.storage.from(bucket).download(path);
        if (error || !data) return null;
        return {
          bytes: new Uint8Array(await data.arrayBuffer()),
          mediaType: data.type || 'image/jpeg',
        };
      },
      async remove(bucket, paths) {
        if (!paths.length) return;
        const { error } = await sb.storage.from(bucket).remove(paths);
        if (error) throw new Error(error.message);
      },
      async list(bucket, prefix) {
        const out: string[] = [];
        for (let offset = 0; ; offset += LIST_PAGE) {
          const { data, error } = await sb.storage
            .from(bucket)
            .list(prefix, { limit: LIST_PAGE, offset });
          if (error) throw new Error(error.message);
          out.push(...(data ?? []).map((f) => `${prefix}/${f.name}`));
          if (!data || data.length < LIST_PAGE) return out;
        }
      },
    },
  };
}
