import { PLANS } from '@bocado/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { usePlan } from '@/services/purchases';

export type ProgressRange = 7 | 30 | 90;

/**
 * Selected chart range, capped by the plan: picking a longer range than the plan allows opens the
 * paywall instead.
 */
export function useProgressRange() {
  const plan = usePlan();
  const maxDays = PLANS[plan].progressChartDays;
  const [range, setRange] = useState<ProgressRange>(7);
  const effective = (maxDays && range > maxDays ? maxDays : range) as ProgressRange;

  const changeRange = (r: ProgressRange) => {
    if (maxDays && r > maxDays) {
      router.push({ pathname: '/paywall', params: { context: 'feature' } });
      return;
    }
    setRange(r);
  };

  return { plan, maxDays, effective, changeRange };
}
