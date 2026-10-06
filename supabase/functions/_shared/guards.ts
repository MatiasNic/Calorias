import { localDate, PLANS, type Plan, type QuotaKind } from './shared/index.ts';
import type { ServerDeps } from './deps.ts';
import { bearerToken, HttpError } from './http.ts';

/** Validates the Supabase JWT and returns the user. */
export async function requireUser(req: Request, deps: ServerDeps) {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'UNAUTHORIZED');
  const user = await deps.userFromToken(token);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED');
  return user;
}

export async function rateLimit(
  deps: ServerDeps,
  bucket: string,
  max: number,
  windowSeconds: number,
) {
  if (!(await deps.db.rateLimit(bucket, max, windowSeconds))) {
    throw new HttpError(429, 'RATE_LIMITED', { retry_after_s: windowSeconds });
  }
}

/** Per-user request limits per function (abuse protection, on top of quotas). */
export const RATE_LIMITS = {
  ai: { max: 12, windowSeconds: 60 },
  lookup: { max: 60, windowSeconds: 60 },
  account: { max: 5, windowSeconds: 3600 },
} as const;

const alertedDays = new Set<string>();

/**
 * Global daily AI spend guard. Above the budget, free users are paused; premium users continue
 * up to 1.5× budget so paying customers are protected. An alert is sent once per day/instance.
 */
export async function checkBudget(deps: ServerDeps, plan: Plan) {
  const spent = await deps.db.aiCostToday();
  const budget = deps.config.aiDailyBudgetUsd;
  if (spent >= budget) {
    const day = deps.now().toISOString().slice(0, 10);
    if (!alertedDays.has(day)) {
      alertedDays.add(day);
      console.error(`[budget] AI daily spend $${spent.toFixed(2)} exceeded budget $${budget}`);
      if (deps.config.aiAlertWebhookUrl) {
        deps
          .fetch(deps.config.aiAlertWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `Bocado: AI spend today $${spent.toFixed(2)} > budget $${budget}`,
            }),
          })
          .catch(() => undefined);
      }
    }
    if (plan === 'free' || spent >= budget * 1.5) throw new HttpError(503, 'BUDGET_EXCEEDED');
  }
}

export interface QuotaTicket {
  kind: QuotaKind;
  day: string;
  bucket: string | null;
  used: number;
  limit: number;
}

/** Atomically consumes one unit of quota (server-side, the only source of truth). */
export async function consumeQuota(
  deps: ServerDeps,
  userId: string,
  plan: Plan,
  kind: QuotaKind,
  timezone: string,
): Promise<QuotaTicket> {
  const day = localDate(deps.now(), timezone);
  const limit = PLANS[plan].daily[kind];
  const trial = PLANS[plan].lifetimeTrial[kind] ?? 0;
  const r = await deps.db.consumeQuota(userId, kind, day, limit, trial);
  if (!r.allowed) {
    if (plan === 'free' && limit === 0) throw new HttpError(403, 'PREMIUM_REQUIRED', { kind });
    throw new HttpError(402, 'QUOTA_EXCEEDED', { kind, limit, used: r.used, plan });
  }
  return { kind, day, bucket: r.bucket, used: r.used, limit };
}

export function quotaPayload(t: QuotaTicket) {
  return { used: t.used, limit: t.limit, remaining: Math.max(0, t.limit - t.used) };
}

/** Photos must live under the caller's own folder: `<user_id>/...`. */
export function assertOwnPath(userId: string, path: string) {
  if (!path.startsWith(`${userId}/`) || path.includes('..'))
    throw new HttpError(403, 'UNAUTHORIZED', { reason: 'foreign_path' });
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const DEDUP_WINDOW_DAYS = 30;
