import {
  computeAchievementStats,
  fullAdherenceDays,
  computeStreak,
  detectRestrictionPattern,
  evaluateAchievements,
  addDays,
  type AchievementId,
  type AchievementStats,
} from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { toast } from '@/components';
import { i18next } from '@/i18n';
import { repos } from '@/services/db/repository';
import { currentUserId } from '@/stores/session';
import { haptic } from '@/utils/haptics';
import { todayLocal } from '@/utils/dates';
import { goalForDate } from '@/features/goals/hooks';
import { achievementTitle } from './achievementText';

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

/** Gathers everything the achievement catalog measures, from the local database. */
export async function loadAchievementStats(): Promise<{
  stats: AchievementStats;
  streak: ReturnType<typeof computeStreak>;
}> {
  const today = todayLocal();
  const [
    meals,
    weights,
    measurements,
    recipes,
    customFoods,
    favorites,
    goals,
    water,
    profile,
    workouts,
    supplements,
    intakes,
  ] = await Promise.all([
    repos.meals.list(),
    repos.weight.list(),
    repos.measurements.count(),
    repos.recipes.count(),
    repos.foodsCustom.count(),
    repos.favorites.count(),
    repos.goals.list(),
    repos.water.list(),
    repos.profile.get(currentUserId()),
    repos.workouts.list(),
    repos.supplements.list(),
    repos.supplementIntakes.list(),
  ]);
  const streak = computeStreak(new Set(meals.map((m) => m.local_date)), today);
  const waterByDate = new Map<string, number>();
  for (const w of water) waterByDate.set(w.local_date, (waterByDate.get(w.local_date) ?? 0) + w.ml);
  const stats = computeAchievementStats({
    meals,
    waterByDate,
    weights,
    goalFor: (date) => goalForDate(goals, date),
    goalType: profile?.goal_type ?? null,
    targetWeightKg: profile?.target_weight_kg ?? null,
    longestStreak: Math.max(streak.longest, streak.current),
    counts: { measurements, recipes, customFoods, favorites },
    training: {
      workouts: workouts.length,
      activeMinutes: workouts.reduce((s, w) => s + w.duration_min, 0),
      supplementDays: fullAdherenceDays(supplements, intakes),
    },
  });
  return { stats, streak };
}

export function useAchievementStats() {
  return useQuery({
    queryKey: ['db', 'achievements', 'stats'],
    queryFn: async () => (await loadAchievementStats()).stats,
  });
}

/** Several actions in a row (a meal plus water plus weight) are checked once. */
const CHECK_DEBOUNCE_MS = 1500;
let pendingCheck: Promise<AchievementId[]> | null = null;

/**
 * Evaluates achievements after a relevant action and celebrates new ones. Reading the whole
 * history is the expensive part, so calls made close together share one evaluation.
 */
export function checkAchievements(): Promise<AchievementId[]> {
  pendingCheck ??= new Promise<AchievementId[]>((resolve, reject) => {
    setTimeout(() => {
      pendingCheck = null;
      runAchievementCheck().then(resolve, reject);
    }, CHECK_DEBOUNCE_MS);
  });
  return pendingCheck;
}

async function runAchievementCheck(): Promise<AchievementId[]> {
  const today = todayLocal();
  const [{ stats, streak }, unlocked, todayMeals, storedStreak] = await Promise.all([
    loadAchievementStats(),
    repos.achievements.list(),
    repos.meals.list({ from: today, to: today }),
    repos.streaks.get(currentUserId()),
  ]);
  const fresh = evaluateAchievements(stats, new Set(unlocked.map((a) => a.id)));
  const unlockedAt = new Date().toISOString();
  for (const id of fresh) await repos.achievements.upsert({ id, unlocked_at: unlockedAt });
  // Only write the streak when it changed: every local write is queued for upload and refreshes
  // the screens that read it.
  const nextStreak = {
    id: currentUserId(),
    current_streak: streak.current,
    longest_streak: streak.longest,
    last_logged_date: todayMeals.length ? today : (storedStreak?.last_logged_date ?? null),
  };
  if (
    !storedStreak ||
    storedStreak.current_streak !== nextStreak.current_streak ||
    storedStreak.longest_streak !== nextStreak.longest_streak ||
    storedStreak.last_logged_date !== nextStreak.last_logged_date
  )
    await repos.streaks.upsert(nextStreak);
  if (fresh.length) {
    haptic('success');
    toast.success(i18next.t('achievements.unlocked', { name: achievementTitle(fresh[0]!) }));
  }
  return fresh;
}
