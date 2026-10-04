import {
  computeStreak,
  detectRestrictionPattern,
  evaluateAchievements,
  addDays,
  type AchievementId,
} from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { toast } from '@/components';
import { i18next } from '@/i18n';
import { repos } from '@/services/db/repository';
import { currentUserId } from '@/stores/session';
import { haptic } from '@/utils/haptics';
import { todayLocal } from '@/utils/dates';
import { goalForDate } from '@/features/goals/hooks';

export function useStreak() {
  return useQuery({
    queryKey: ['db', 'meals', 'streak'],
    queryFn: async () => computeStreak(await repos.meals.dates(), todayLocal()),
  });
}

/** Sustained very-low intake → show supportive message with professional resources. */
export function useRestrictionCheck() {
  return useQuery({
    queryKey: ['db', 'meals', 'restriction'],
    queryFn: async () => {
      const today = todayLocal();
      const meals = await repos.meals.list({ from: addDays(today, -7), to: addDays(today, -1) });
      const byDate = new Map<string, { kcal: number; mealCount: number }>();
      for (const m of meals) {
        const d = byDate.get(m.local_date) ?? { kcal: 0, mealCount: 0 };
        d.kcal += m.totals.kcal;
        d.mealCount += 1;
        byDate.set(m.local_date, d);
      }
      return detectRestrictionPattern([...byDate.entries()].map(([date, v]) => ({ date, ...v })));
    },
  });
}

/** Evaluates achievements after a relevant action and celebrates new ones. */
export async function checkAchievements(): Promise<AchievementId[]> {
  const today = todayLocal();
  const [meals, unlocked, weights, recipes, goals, water] = await Promise.all([
    repos.meals.list(),
    repos.achievements.list(),
    repos.weight.count(),
    repos.recipes.count(),
    repos.goals.list(),
    repos.water.list({ from: today, to: today }),
  ]);
  const goal = goalForDate(goals, today);
  const todayMeals = meals.filter((m) => m.local_date === today);
  const protein = todayMeals.reduce((s, m) => s + m.totals.protein_g, 0);
  const waterMl = water.reduce((s, w) => s + w.ml, 0);
  const streak = computeStreak(new Set(meals.map((m) => m.local_date)), today);
  const fresh = evaluateAchievements(
    {
      mealsLogged: meals.length,
      photoScans: meals.filter((m) => m.source === 'photo').length,
      currentStreak: streak.current,
      proteinGoalHitToday: goal.protein_g > 0 && protein >= goal.protein_g,
      waterGoalHitToday: !!goal.water_ml && waterMl >= goal.water_ml,
      weighIns: weights,
      recipes,
    },
    new Set(unlocked.map((a) => a.id)),
  );
  for (const id of fresh) {
    await repos.achievements.upsert({ id, unlocked_at: new Date().toISOString() });
  }
  await repos.streaks.upsert({
    id: currentUserId(),
    current_streak: streak.current,
    longest_streak: streak.longest,
    last_logged_date: todayMeals.length ? today : null,
  });
  if (fresh.length) {
    haptic('success');
    toast.success(
      i18next.t('achievements.unlocked', {
        name: i18next.t(`achievements.items.${fresh[0]!}.title`),
      }),
    );
  }
  return fresh;
}
