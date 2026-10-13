import { PLANS, QuotaStatusSchema, type QuotaKind, type QuotaStatus } from '@plato/shared';

import { invokeFunction } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { usePlanStore } from '@/services/purchases';
import { kv } from '@/stores/kv';
import { useSessionStore } from '@/stores/session';
import { todayLocal } from '@/utils/dates';
import { mocked } from './mode';
import { STORAGE_KEYS } from '@/stores/storageKeys';

// ── demo-mode quota emulation (locally enforced daily quotas so the paywall can be tested) ──
const MOCK_QUOTA_KEY = STORAGE_KEYS.mockQuota;
type MockUsage = Record<string, Record<QuotaKind, number>>;

function mockUsage(): MockUsage {
  try {
    return JSON.parse(kv.get(MOCK_QUOTA_KEY) ?? '{}') as MockUsage;
  } catch {
    // Corrupt demo counters just reset the demo quota.
    return {};
  }
}

/** Lifetime trials (e.g. the free coach message) are counted once, not per day. */
const MOCK_TRIAL_KEY = STORAGE_KEYS.mockTrials;
function mockTrialsUsed(kind: QuotaKind): number {
  try {
    return (
      (JSON.parse(kv.get(MOCK_TRIAL_KEY) ?? '{}') as Partial<Record<QuotaKind, number>>)[kind] ?? 0
    );
  } catch {
    // Corrupt demo counters just reset the demo trial.
    return 0;
  }
}

/** Demo mode: counts one use of `kind`, throwing the same errors as the server when exhausted. */
export function consumeMock(kind: QuotaKind) {
  const plan = usePlanStore.getState().plan;
  const day = todayLocal();
  const all = mockUsage();
  const used = all[day]?.[kind] ?? 0;
  const limit = PLANS[plan].daily[kind];
  const trial = PLANS[plan].lifetimeTrial[kind] ?? 0;
  if (limit === 0 && trial > 0) {
    // Same as the server: a free feature with a one-time trial, then Premium is required.
    const usedTrial = mockTrialsUsed(kind);
    if (usedTrial >= trial) throw new ApiError('PREMIUM_REQUIRED', 403, { kind });
    kv.set(MOCK_TRIAL_KEY, JSON.stringify({ [kind]: usedTrial + 1 }));
    return { used: usedTrial + 1, limit: trial, remaining: Math.max(0, trial - usedTrial - 1) };
  }
  if (used >= limit)
    throw new ApiError(
      limit === 0 ? 'PREMIUM_REQUIRED' : 'QUOTA_EXCEEDED',
      limit === 0 ? 403 : 402,
      { limit, used, kind },
    );
  all[day] = { photo_scan: 0, text_query: 0, coach_message: 0, ...all[day], [kind]: used + 1 };
  kv.set(MOCK_QUOTA_KEY, JSON.stringify({ [day]: all[day] }));
  return { used: used + 1, limit, remaining: Math.max(0, limit - used - 1) };
}

export async function fetchQuotaStatus(): Promise<QuotaStatus> {
  const plan = usePlanStore.getState().plan;
  if (mocked() || useSessionStore.getState().status !== 'authenticated') {
    const day = todayLocal();
    const u = mockUsage()[day] ?? { photo_scan: 0, text_query: 0, coach_message: 0 };
    const e = (kind: QuotaKind) => ({
      used: u[kind],
      limit: PLANS[plan].daily[kind],
      remaining: Math.max(0, PLANS[plan].daily[kind] - u[kind]),
    });
    return {
      plan,
      day,
      photo_scan: e('photo_scan'),
      text_query: e('text_query'),
      coach_message: e('coach_message'),
      bonus_photo_scans: 0,
      coach_trial_remaining:
        plan === 'free'
          ? Math.max(
              0,
              (PLANS.free.lifetimeTrial.coach_message ?? 0) - mockTrialsUsed('coach_message'),
            )
          : 0,
    };
  }
  return invokeFunction('quota-status', {}, QuotaStatusSchema);
}
