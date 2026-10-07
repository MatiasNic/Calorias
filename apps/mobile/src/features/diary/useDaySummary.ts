import { dailyExerciseKcal, dailySummary, type IsoDate } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { useWaterForDate } from '@/features/body/hooks';
import { useGoalForDate } from '@/features/goals/hooks';
import { useWorkoutsForDate } from '@/features/training/hooks';
import { readTodayActivity } from '@/services/health';
import { usePlan } from '@/services/purchases';
import { usePrefsStore } from '@/stores/prefs';
import { todayLocal } from '@/utils/dates';
import { useMealsForDate } from './hooks';

export function useDaySummary(date: IsoDate) {
  const meals = useMealsForDate(date);
  const { goal } = useGoalForDate(date);
  const water = useWaterForDate(date);
  const plan = usePlan();
  const activity = useQuery({
    queryKey: ['health', 'activity', date],
    queryFn: readTodayActivity,
    enabled: plan === 'premium' && date === todayLocal(),
    staleTime: 5 * 60_000,
  });
  const workouts = useWorkoutsForDate(date);
  const exerciseInBudget = usePrefsStore((s) => s.exerciseInBudget);
  const loggedKcal = (workouts.data ?? []).reduce((s, w) => s + w.kcal, 0);
  const burnedKcal = dailyExerciseKcal(loggedKcal, activity.data?.activeKcal ?? null);
  const exerciseKcal = exerciseInBudget ? burnedKcal : 0;
  const summary = dailySummary(
    (meals.data ?? []).map((m) => ({ meal_type: m.meal_type, totals: m.totals })),
    {
      kcal: goal.kcal,
      protein_g: goal.protein_g,
      carbs_g: goal.carbs_g,
      fat_g: goal.fat_g,
      fiber_g: goal.fiber_g,
      water_ml: goal.water_ml,
    },
    exerciseKcal,
  );
  return {
    meals: meals.data ?? [],
    isLoading: meals.isLoading,
    isError: meals.isError,
    refetch: meals.refetch,
    goal,
    summary,
    waterMl: water.data?.totalMl ?? 0,
    steps: activity.data?.steps ?? null,
    workouts: workouts.data ?? [],
    burnedKcal,
  };
}
