import type { DailySummary } from '@plato/shared';

export type Insight =
  | { kind: 'start_day' }
  | { kind: 'protein_gap'; grams: number }
  | { kind: 'water_low'; ml: number }
  | { kind: 'fiber_low'; grams: number }
  | { kind: 'over_target'; kcal: number }
  | { kind: 'on_track'; kcal: number }
  | { kind: 'goal_reached' };

/** Picks one helpful, neutral insight for the day. Pure function (tested). */
export function pickInsight(
  s: DailySummary,
  waterMl: number,
  waterTarget: number | null,
  hour: number,
): Insight {
  if (s.mealCount === 0) return { kind: 'start_day' };
  const proteinGap = Math.round(s.target.protein_g - s.consumed.protein_g);
  if (s.remainingKcal < -s.target.kcal * 0.1)
    return { kind: 'over_target', kcal: Math.abs(s.remainingKcal) };
  if (hour >= 15 && proteinGap >= 25) return { kind: 'protein_gap', grams: proteinGap };
  if (waterTarget && hour >= 16 && waterMl < waterTarget * 0.5)
    return { kind: 'water_low', ml: waterTarget - waterMl };
  const fiberGap = Math.round((s.target.fiber_g ?? 0) - (s.consumed.fiber_g ?? 0));
  if (hour >= 18 && fiberGap >= 10) return { kind: 'fiber_low', grams: fiberGap };
  if (Math.abs(s.remainingKcal) <= s.target.kcal * 0.05 && hour >= 19)
    return { kind: 'goal_reached' };
  return { kind: 'on_track', kcal: Math.max(0, s.remainingKcal) };
}
