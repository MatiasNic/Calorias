import {
  MealPlanSchema,
  mockMealPlan,
  type MealPlan,
  type MealPlanPreferences,
} from '@bocado/shared';
import { z } from 'zod';

import { currentLocale } from '@/i18n';
import { invokeFunction } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { usePlanStore } from '@/services/purchases';
import { mocked, MOCK_DELAY_MS, sleep } from './mode';

export async function generateMealPlan(
  budget: 'low' | 'mid' | 'high',
  days = 7,
  preferences?: MealPlanPreferences,
): Promise<MealPlan> {
  if (mocked()) {
    if (usePlanStore.getState().plan !== 'premium') throw new ApiError('PREMIUM_REQUIRED', 403);
    await sleep(MOCK_DELAY_MS);
    return mockMealPlan(days, preferences);
  }
  const res = await invokeFunction(
    'meal-plan',
    { locale: currentLocale(), budget, days, preferences },
    z.object({ plan: MealPlanSchema }),
  );
  return res.plan;
}
