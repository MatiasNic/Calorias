import { PLANS } from './plans.ts';
import type { Plan, QuotaKind } from './schemas/enums.ts';

export interface QuotaUsage {
  /** Used today. */
  used: number;
  /** Used over the account's lifetime (for trial allowances). */
  lifetimeUsed?: number;
  /** Extra purchased credits (e.g. scan packs), consumed after the daily allowance. */
  bonusCredits?: number;
}

export interface QuotaDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Which bucket would be consumed if allowed. */
  bucket: 'daily' | 'trial' | 'bonus' | null;
}

/** Pure quota decision. The server is the source of truth; the app uses this only for UI hints. */
export function checkQuota(plan: Plan, kind: QuotaKind, usage: QuotaUsage): QuotaDecision {
  const limits = PLANS[plan];
  const daily = limits.daily[kind];
  const used = Math.max(0, usage.used);

  if (used < daily) {
    return { allowed: true, limit: daily, remaining: daily - used - 1, bucket: 'daily' };
  }
  const trial = limits.lifetimeTrial[kind] ?? 0;
  if (trial > 0 && (usage.lifetimeUsed ?? 0) < trial) {
    return {
      allowed: true,
      limit: trial,
      remaining: trial - (usage.lifetimeUsed ?? 0) - 1,
      bucket: 'trial',
    };
  }
  const bonus = usage.bonusCredits ?? 0;
  if (kind === 'photo_scan' && bonus > 0) {
    return { allowed: true, limit: daily, remaining: bonus - 1, bucket: 'bonus' };
  }
  return { allowed: false, limit: daily, remaining: 0, bucket: null };
}

/** Remaining uses today for display (does not consume). */
export function remainingToday(
  plan: Plan,
  kind: QuotaKind,
  used: number,
  bonusCredits = 0,
): number {
  const daily = PLANS[plan].daily[kind];
  return Math.max(0, daily - used) + (kind === 'photo_scan' ? bonusCredits : 0);
}
