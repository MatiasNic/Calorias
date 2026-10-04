import {
  addDays,
  fillDays,
  periodSummary,
  weightTrend,
  weeklyRateKg,
  type DayTotals,
  type IsoDate,
  type Nutrients,
} from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { goalForDate } from '@/features/goals/hooks';
import { repos } from '@/services/db/repository';
import type { MealRecord, WeightRecord } from '@/services/db/types';
import { todayLocal } from '@/utils/dates';

export const toEntries = (ws: readonly WeightRecord[]) =>
  ws.map((w) => ({ date: w.local_date, weightKg: w.weight_kg }));

export function dayTotalsFrom(
  meals: readonly MealRecord[],
  goals: Parameters<typeof goalForDate>[0],
): DayTotals[] {
  const map = new Map<string, DayTotals>();
  for (const m of meals) {
    const d = map.get(m.local_date) ?? {
      date: m.local_date,
      totals: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
      mealCount: 0,
      targetKcal: goalForDate(goals, m.local_date).kcal,
    };
    const t = d.totals as Required<
      Pick<Nutrients, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g'>
    >;
    t.kcal += m.totals.kcal;
    t.protein_g += m.totals.protein_g;
    t.carbs_g += m.totals.carbs_g;
    t.fat_g += m.totals.fat_g;
    t.fiber_g += m.totals.fiber_g ?? 0;
    d.mealCount += 1;
    map.set(m.local_date, d);
  }
  return [...map.values()];
}

export function useProgress(days: number) {
  const to = todayLocal();
  const from = addDays(to, -(days - 1));
  return useQuery({
    queryKey: ['db', 'meals', 'progress', days, to],
    queryFn: async () => {
      const [meals, goals, weights] = await Promise.all([
        repos.meals.list({ from, to }),
        repos.goals.list(),
        repos.weight.list(),
      ]);
      const goal = goalForDate(goals, to);
      const dayTotals = dayTotalsFrom(meals, goals);
      const filled = fillDays(dayTotals, from, to, goal.kcal);
      const summary = periodSummary(dayTotals, from, to);
      const trend = weightTrend(toEntries(weights));
      const windowTrend = trend.filter((p) => p.date >= addDays(to, -Math.max(days, 28)));
      const rate = weeklyRateKg(windowTrend);

      const byMealType = new Map<string, number>();
      const foods = new Map<string, { name: string; count: number; kcal: number }>();
      for (const m of meals) {
        byMealType.set(m.meal_type, (byMealType.get(m.meal_type) ?? 0) + m.totals.kcal);
        for (const i of m.items) {
          const key = i.food_id ?? i.display_name.toLowerCase();
          const f = foods.get(key) ?? { name: i.display_name, count: 0, kcal: 0 };
          f.count += 1;
          f.kcal += i.nutrients.kcal;
          foods.set(key, f);
        }
      }
      const topFoods = [...foods.values()]
        .sort((a, b) => b.count - a.count || b.kcal - a.kcal)
        .slice(0, 5);
      return { from, to, goal, filled, summary, trend, rate, byMealType, topFoods, weights };
    },
  });
}

export function useWeekRange(weekStart: IsoDate) {
  const to = addDays(weekStart, 6);
  return useQuery({
    queryKey: ['db', 'meals', 'week', weekStart],
    queryFn: async () => {
      const [meals, goals, weights] = await Promise.all([
        repos.meals.list({ from: weekStart, to }),
        repos.goals.list(),
        repos.weight.list(),
      ]);
      return {
        days: dayTotalsFrom(meals, goals),
        goal: goalForDate(goals, to),
        weights: weightTrend(toEntries(weights)),
      };
    },
  });
}
