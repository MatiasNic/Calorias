import type { GoalPlan, IsoDate } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { newId, repos } from '@/services/db/repository';
import type { GoalRecord } from '@/services/db/types';
import { todayLocal } from '@/utils/dates';

/** Fallback when the user skipped onboarding (should not happen in normal flows). */
export const DEFAULT_GOAL: GoalRecord = {
  id: 'default',
  kcal: 2000,
  protein_g: 100,
  carbs_g: 250,
  fat_g: 65,
  fiber_g: 28,
  water_ml: 2000,
  mode: 'fixed',
  effective_from: '1970-01-01',
  tdee_estimate: null,
};

/** Goal in effect on a date = latest goal with effective_from <= date. */
export function goalForDate(goals: readonly GoalRecord[], date: IsoDate): GoalRecord {
  const applicable = goals
    .filter((g) => g.effective_from <= date)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));
  return applicable[0] ?? goals[0] ?? DEFAULT_GOAL;
}

export function useGoals() {
  return useQuery({ queryKey: ['db', 'goals'], queryFn: () => repos.goals.list() });
}

export function useGoalForDate(date: IsoDate) {
  const q = useGoals();
  return { ...q, goal: q.data ? goalForDate(q.data, date) : DEFAULT_GOAL };
}

/** Stores a new goal effective from today (keeps history; replaces a same-day goal). */
export async function saveGoalFromPlan(
  plan: GoalPlan,
  mode: GoalRecord['mode'] = 'fixed',
  tdeeEstimate?: number,
) {
  const today = todayLocal();
  const existing = (await repos.goals.list({ from: today, to: today }))[0];
  return repos.goals.upsert({
    id: existing?.id ?? newId(),
    kcal: plan.kcal,
    protein_g: plan.macros.protein_g,
    carbs_g: plan.macros.carbs_g,
    fat_g: plan.macros.fat_g,
    fiber_g: plan.macros.fiber_g,
    water_ml: plan.waterMl,
    mode,
    effective_from: today,
    tdee_estimate: tdeeEstimate ?? plan.tdee,
  });
}

export async function saveCustomGoal(g: Omit<GoalRecord, 'id' | 'effective_from'>) {
  const today = todayLocal();
  const existing = (await repos.goals.list({ from: today, to: today }))[0];
  return repos.goals.upsert({ ...g, id: existing?.id ?? newId(), effective_from: today });
}
