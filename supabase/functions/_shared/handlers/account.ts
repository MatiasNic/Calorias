import { z } from 'zod';

import { localDate, PLANS, type QuotaStatus } from '../shared/index.ts';
import type { ServerDeps } from '../deps.ts';
import { rateLimit, RATE_LIMITS, requireUser } from '../guards.ts';
import { HttpError, json, parseBody } from '../http.ts';

const BUCKETS = ['meal-photos', 'progress-photos'] as const;

/** POST /quota-status — what the user has left today (for UI hints; enforcement is server-side). */
export async function quotaStatus(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const [profile, plan, credits] = await Promise.all([
    deps.db.profile(user.id),
    deps.db.plan(user.id),
    deps.db.credits(user.id),
  ]);
  const day = localDate(deps.now(), profile.timezone);
  const usage = await deps.db.quotaUsage(user.id, day);
  const limits = PLANS[plan].daily;
  const entry = (used: number, limit: number) => ({
    used,
    limit,
    remaining: Math.max(0, limit - used),
  });
  const trial = PLANS[plan].lifetimeTrial.coach_message ?? 0;
  const status: QuotaStatus = {
    plan,
    day,
    photo_scan: entry(usage.photo_scans, limits.photo_scan),
    text_query: entry(usage.text_queries, limits.text_query),
    coach_message: entry(usage.coach_messages, limits.coach_message),
    bonus_photo_scans: credits.bonus_photo_scans,
    coach_trial_remaining: Math.max(0, trial - credits.lifetime_coach_messages),
  };
  return json(status);
}

const DeleteSchema = z.object({ confirm: z.literal(true) });

/**
 * POST /delete-account — required by Apple/Google. Deletes photos, then the auth user, which
 * cascades to every personal table (FK ON DELETE CASCADE). The audit row keeps no personal data.
 */
export async function deleteAccount(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  await parseBody(req, DeleteSchema);
  await rateLimit(
    deps,
    `account:${user.id}`,
    RATE_LIMITS.account.max,
    RATE_LIMITS.account.windowSeconds,
  );
  await deps.db.audit(user.id, 'account_deletion_requested', {});
  for (const bucket of BUCKETS) {
    const paths = await deps.storage.list(bucket, user.id);
    for (let i = 0; i < paths.length; i += 100)
      await deps.storage.remove(bucket, paths.slice(i, i + 100));
  }
  await deps.deleteAuthUser(user.id);
  await deps.db.audit(user.id, 'account_deleted', {});
  return json({ deleted: true });
}

const ExportSchema = z.object({ format: z.enum(['json', 'csv']).default('json') });

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * POST /export-data — right of access (Ley 25.326 / GDPR). JSON export is free for everyone;
 * the CSV convenience export is a premium feature.
 */
export async function exportData(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const { format } = await parseBody(req, ExportSchema);
  await rateLimit(
    deps,
    `account:${user.id}`,
    RATE_LIMITS.account.max,
    RATE_LIMITS.account.windowSeconds,
  );
  if (format === 'csv' && (await deps.db.plan(user.id)) !== 'premium')
    throw new HttpError(403, 'PREMIUM_REQUIRED', { feature: 'export_csv' });
  const data = await deps.db.exportUserData(user.id);
  await deps.db.audit(user.id, 'data_exported', { format });
  if (format === 'json') {
    return json({
      exported_at: deps.now().toISOString(),
      user: { id: user.id, email: user.email },
      ...data,
    });
  }
  const meals = (data.meals ?? []) as Record<string, unknown>[];
  const header = [
    'date',
    'time',
    'meal_type',
    'source',
    'food',
    'grams',
    'kcal',
    'protein_g',
    'carbs_g',
    'fat_g',
    'fiber_g',
    'food_source',
  ];
  const rows = [header.join(',')];
  for (const m of meals) {
    for (const i of (m.meal_items ?? []) as Record<string, unknown>[]) {
      rows.push(
        [
          m.local_date,
          m.eaten_at,
          m.meal_type,
          m.source,
          i.display_name,
          i.grams,
          i.kcal,
          i.protein_g,
          i.carbs_g,
          i.fat_g,
          i.fiber_g,
          i.food_source,
        ]
          .map(csvEscape)
          .join(','),
      );
    }
  }
  return json({ exported_at: deps.now().toISOString(), csv: rows.join('\n') });
}
