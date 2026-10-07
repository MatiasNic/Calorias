import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { addDays, type AppLocale, type Plan } from './shared/index.ts';
import { AnthropicProvider } from './ai/anthropic.ts';
import { MockProvider } from './ai/mock.ts';
import { loadConfig, type ServerConfig } from './config.ts';
import type { ServerDeps } from './deps.ts';
import { trainingSummaryLine } from './coachSummary.ts';
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
        const current = must(
          await sb
            .from('user_credits')
            .select('bonus_photo_scans')
            .eq('user_id', userId)
            .maybeSingle(),
        );
        must(
          await sb.from('user_credits').upsert({
            user_id: userId,
            bonus_photo_scans: (current?.bonus_photo_scans ?? 0) + amount,
          }),
        );
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
            .select('local_date, meal_type, kcal, protein_g, carbs_g, fat_g, fiber_g')
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
        const lines = [
          `Goal: ${profile.data?.goal_type ?? 'unknown'}; activity ${profile.data?.activity_level ?? 'unknown'}.`,
          g
            ? `Daily targets: ${g.kcal} kcal, P ${g.protein_g} g, C ${g.carbs_g} g, F ${g.fat_g} g.`
            : 'No targets set.',
          `Today so far: ${Math.round(t.kcal)} kcal, P ${Math.round(t.p)} g, C ${Math.round(t.c)} g, F ${Math.round(t.f)} g.`,
          `Last 7 days logged: ${byDay.size} days; average ${byDay.size ? Math.round([...byDay.values()].reduce((s, d) => s + d.kcal, 0) / byDay.size) : 0} kcal/day.`,
          weight.data
            ? `Latest weight: ${weight.data.weight_kg} kg (${weight.data.local_date}).`
            : 'No weight logged.',
          trainingSummaryLine(workouts.data ?? [], supplements.data ?? []),
        ];
        return lines.join('\n');
      },
      async exportUserData(userId) {
        const out: Record<string, unknown> = {};
        out.profile = must(await sb.from('profiles').select('*').eq('id', userId).maybeSingle());
        out.meals = must(
          await sb.from('meals').select('*, meal_items(*)').eq('user_id', userId).order('eaten_at'),
        );
        for (const t of EXPORT_TABLES)
          out[t] = must(await sb.from(t).select('*').eq('user_id', userId));
        out.ai_scans = must(
          await sb
            .from('ai_scans')
            .select('id, kind, model, status, created_at, cost_usd')
            .eq('user_id', userId),
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
        const existing = must(
          await sb
            .from('subscriptions')
            .select('last_event_at')
            .eq('user_id', s.user_id)
            .maybeSingle(),
        );
        // Ignore out-of-order deliveries older than the state we already have.
        if (existing?.last_event_at && new Date(existing.last_event_at) > new Date(s.last_event_at))
          return;
        must(
          await sb.from('subscriptions').upsert({
            ...s,
            entitlement: 'premium',
            updated_by_webhook_at: new Date().toISOString(),
          }),
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
        if (paths.length) await sb.storage.from(bucket).remove(paths);
      },
      async list(bucket, prefix) {
        const { data } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
        return (data ?? []).map((f) => `${prefix}/${f.name}`);
      },
    },
  };
}
