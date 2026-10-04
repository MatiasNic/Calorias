/** Achievement catalog. Titles/descriptions live in i18n under `achievements.<id>`. */
export const ACHIEVEMENTS = [
  { id: 'first_meal', icon: 'restaurant' },
  { id: 'first_scan', icon: 'camera' },
  { id: 'streak_3', icon: 'flame' },
  { id: 'streak_7', icon: 'flame' },
  { id: 'streak_30', icon: 'trophy' },
  { id: 'protein_goal', icon: 'barbell' },
  { id: 'water_goal', icon: 'water' },
  { id: 'first_weigh_in', icon: 'scale' },
  { id: 'meals_50', icon: 'ribbon' },
  { id: 'first_recipe', icon: 'book' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export interface AchievementStats {
  mealsLogged: number;
  photoScans: number;
  currentStreak: number;
  proteinGoalHitToday: boolean;
  waterGoalHitToday: boolean;
  weighIns: number;
  recipes: number;
}

const RULES: Record<AchievementId, (s: AchievementStats) => boolean> = {
  first_meal: (s) => s.mealsLogged >= 1,
  first_scan: (s) => s.photoScans >= 1,
  streak_3: (s) => s.currentStreak >= 3,
  streak_7: (s) => s.currentStreak >= 7,
  streak_30: (s) => s.currentStreak >= 30,
  protein_goal: (s) => s.proteinGoalHitToday,
  water_goal: (s) => s.waterGoalHitToday,
  first_weigh_in: (s) => s.weighIns >= 1,
  meals_50: (s) => s.mealsLogged >= 50,
  first_recipe: (s) => s.recipes >= 1,
};

/** Returns newly unlocked achievement ids (not present in `alreadyUnlocked`). */
export function evaluateAchievements(
  stats: AchievementStats,
  alreadyUnlocked: ReadonlySet<string>,
): AchievementId[] {
  return ACHIEVEMENTS.map((a) => a.id).filter((id) => !alreadyUnlocked.has(id) && RULES[id](stats));
}
