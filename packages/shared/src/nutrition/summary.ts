import type { MealType } from '../schemas/enums.ts';
import type { Nutrients } from '../schemas/nutrients.ts';
import { addDays, dateRange, type IsoDate } from '../dates.ts';
import { sumNutrients } from './portions.ts';

export interface GoalTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  water_ml?: number | null;
}

export interface MealLike {
  meal_type: MealType;
  totals: Nutrients;
}

export interface DailySummary {
  consumed: Nutrients;
  target: GoalTargets;
  exerciseKcal: number;
  /** target + exercise − consumed (can be negative). */
  remainingKcal: number;
  /** 0–1+ progress per macro vs target. */
  progress: { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
  byMealType: Partial<Record<MealType, Nutrients>>;
  mealCount: number;
}

const ratio = (value: number, target: number | null | undefined) =>
  target && target > 0 ? value / target : 0;

export function dailySummary(
  meals: readonly MealLike[],
  target: GoalTargets,
  exerciseKcal = 0,
): DailySummary {
  const consumed = sumNutrients(meals.map((m) => m.totals));
  const byMealType: Partial<Record<MealType, Nutrients>> = {};
  for (const m of meals) {
    const prev = byMealType[m.meal_type];
    byMealType[m.meal_type] = prev ? sumNutrients([prev, m.totals]) : sumNutrients([m.totals]);
  }
  return {
    consumed,
    target,
    exerciseKcal,
    remainingKcal: Math.round(target.kcal + exerciseKcal - consumed.kcal),
    progress: {
      kcal: ratio(consumed.kcal, target.kcal + exerciseKcal),
      protein: ratio(consumed.protein_g, target.protein_g),
      carbs: ratio(consumed.carbs_g, target.carbs_g),
      fat: ratio(consumed.fat_g, target.fat_g),
      fiber: ratio(consumed.fiber_g ?? 0, target.fiber_g),
    },
    byMealType,
    mealCount: meals.length,
  };
}

export interface DayTotals {
  date: IsoDate;
  totals: Nutrients;
  mealCount: number;
  targetKcal: number;
}

export interface PeriodSummary {
  from: IsoDate;
  to: IsoDate;
  loggedDays: number;
  totalDays: number;
  avg: Nutrients;
  avgTargetKcal: number;
  /** Share (0–1) of logged days within ±tolerance of the calorie target. */
  adherence: number;
  daysInRange: number;
  best: DayTotals | null;
}

/** Default tolerance for "in range": ±10 % of target. */
export const ADHERENCE_TOLERANCE = 0.1;

export function isInRange(kcal: number, target: number, tolerance = ADHERENCE_TOLERANCE): boolean {
  if (target <= 0) return false;
  return Math.abs(kcal - target) <= target * tolerance;
}

/** Summary over a date range. Averages are computed over *logged* days only. */
export function periodSummary(
  days: readonly DayTotals[],
  from: IsoDate,
  to: IsoDate,
): PeriodSummary {
  const inPeriod = days.filter((d) => d.date >= from && d.date <= to);
  const logged = inPeriod.filter((d) => d.mealCount > 0);
  const n = logged.length;
  const sum = sumNutrients(logged.map((d) => d.totals));
  const avg: Nutrients = {
    kcal: n ? Math.round(sum.kcal / n) : 0,
    protein_g: n ? Math.round((sum.protein_g / n) * 10) / 10 : 0,
    carbs_g: n ? Math.round((sum.carbs_g / n) * 10) / 10 : 0,
    fat_g: n ? Math.round((sum.fat_g / n) * 10) / 10 : 0,
    fiber_g: n ? Math.round(((sum.fiber_g ?? 0) / n) * 10) / 10 : 0,
  };
  const daysInRange = logged.filter((d) => isInRange(d.totals.kcal, d.targetKcal)).length;
  const best =
    logged.length > 0
      ? logged.reduce((a, b) =>
          Math.abs(a.totals.kcal - a.targetKcal) <= Math.abs(b.totals.kcal - b.targetKcal) ? a : b,
        )
      : null;
  return {
    from,
    to,
    loggedDays: n,
    totalDays: dateRange(from, to).length,
    avg,
    avgTargetKcal: n ? Math.round(logged.reduce((s, d) => s + d.targetKcal, 0) / n) : 0,
    adherence: n ? daysInRange / n : 0,
    daysInRange,
    best,
  };
}

/** Fills missing dates with zero totals so charts get a continuous axis. */
export function fillDays(
  days: readonly DayTotals[],
  from: IsoDate,
  to: IsoDate,
  targetKcal: number,
): DayTotals[] {
  const map = new Map(days.map((d) => [d.date, d]));
  return dateRange(from, to).map(
    (date) =>
      map.get(date) ?? {
        date,
        totals: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        mealCount: 0,
        targetKcal,
      },
  );
}

export function previousPeriod(from: IsoDate, to: IsoDate): { from: IsoDate; to: IsoDate } {
  const len = dateRange(from, to).length;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}
