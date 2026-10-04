import { KCAL_PER_KG_BODY_WEIGHT, SAFETY } from '../constants.ts';
import type { ActivityLevel, DietaryPreference, GoalType, Sex } from '../schemas/enums.ts';
import { bmi, bmrMifflinStJeor, tdee as computeTdee } from './energy.ts';
import { splitMacros, waterTargetMl, type MacroTargets } from './macros.ts';

export type GoalWarning =
  | 'rate_capped'
  | 'aggressive_rate'
  | 'calorie_floor_applied'
  | 'below_bmr'
  | 'minor_no_deficit'
  | 'target_inconsistent'
  | 'gain_rate_capped';

export type GoalBlockReason =
  'under_min_age' | 'target_bmi_too_low' | 'underweight_cannot_lose' | 'invalid_input';

export interface GoalPlanInput {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number | null;
  activity: ActivityLevel;
  goal: GoalType;
  /** Desired magnitude of weekly weight change in kg (always positive). */
  weeklyRateKg?: number | null;
  dietaryPreferences?: readonly DietaryPreference[];
  /** Reference date for the estimated goal date. */
  today?: Date;
}

export interface ProjectionPoint {
  week: number;
  weightKg: number;
}

export interface GoalPlan {
  bmr: number;
  tdee: number;
  kcal: number;
  macros: MacroTargets;
  waterMl: number;
  effectiveGoal: GoalType;
  /** Signed kg/week: negative = loss. */
  weeklyChangeKg: number;
  estimatedWeeks: number | null;
  estimatedDate: string | null;
  warnings: GoalWarning[];
  projection: ProjectionPoint[];
}

export type GoalPlanResult = { ok: true; plan: GoalPlan } | { ok: false; reason: GoalBlockReason };

const DEFAULT_LOSS_RATE_KG = 0.5;
const DEFAULT_GAIN_RATE_KG = 0.25;
const MAX_PROJECTION_WEEKS = 104;
const KCAL_ROUNDING = 10;

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function isValidInput(i: GoalPlanInput): boolean {
  return (
    Number.isFinite(i.ageYears) &&
    i.ageYears <= SAFETY.maxAge &&
    i.heightCm >= 100 &&
    i.heightCm <= 250 &&
    i.weightKg >= 30 &&
    i.weightKg <= 350
  );
}

/**
 * Computes calorie and macro targets with built-in health safeguards:
 * calorie floors, max 1 % body weight loss per week, no target BMI under 18.5,
 * and no deficits for minors.
 */
export function computeGoalPlan(input: GoalPlanInput): GoalPlanResult {
  if (!isValidInput(input)) return { ok: false, reason: 'invalid_input' };
  if (input.ageYears < SAFETY.minAge) return { ok: false, reason: 'under_min_age' };

  const { sex, ageYears, heightCm, weightKg, activity } = input;
  const warnings: GoalWarning[] = [];
  let goal: GoalType = input.goal;
  let target = input.targetWeightKg ?? null;

  if (goal === 'lose') {
    if (bmi(weightKg, heightCm) < SAFETY.minHealthyBmi) {
      return { ok: false, reason: 'underweight_cannot_lose' };
    }
    if (target != null && bmi(target, heightCm) < SAFETY.minHealthyBmi) {
      return { ok: false, reason: 'target_bmi_too_low' };
    }
    if (ageYears < SAFETY.minAgeForDeficit) {
      goal = 'maintain';
      warnings.push('minor_no_deficit');
    }
  }

  if (target != null) {
    const inconsistent =
      (goal === 'lose' && target >= weightKg) ||
      ((goal === 'gain' || goal === 'build_muscle') && target <= weightKg);
    if (inconsistent) {
      warnings.push('target_inconsistent');
      target = null;
    }
  }

  const bmr = bmrMifflinStJeor({ sex, ageYears, heightCm, weightKg });
  const tdee = computeTdee(bmr, activity);

  let kcal = tdee;
  if (goal === 'lose') {
    const desired = input.weeklyRateKg ?? DEFAULT_LOSS_RATE_KG;
    const maxRate = weightKg * SAFETY.maxWeeklyLossFraction;
    let rate = desired;
    if (rate > maxRate) {
      rate = maxRate;
      warnings.push('rate_capped');
    }
    if (rate > weightKg * SAFETY.aggressiveWeeklyLossFraction) warnings.push('aggressive_rate');
    kcal = tdee - (rate * KCAL_PER_KG_BODY_WEIGHT) / 7;
  } else if (goal === 'gain' || goal === 'build_muscle') {
    let rate = input.weeklyRateKg ?? DEFAULT_GAIN_RATE_KG;
    if (rate > SAFETY.maxWeeklyGainKg) {
      rate = SAFETY.maxWeeklyGainKg;
      warnings.push('gain_rate_capped');
    }
    kcal = tdee + (rate * KCAL_PER_KG_BODY_WEIGHT) / 7;
  }

  const floor = SAFETY.calorieFloor[sex];
  if (kcal < floor) {
    kcal = floor;
    warnings.push('calorie_floor_applied');
  }
  if (goal === 'lose' && kcal < bmr) warnings.push('below_bmr');

  kcal = roundTo(kcal, KCAL_ROUNDING);
  const weeklyChangeKg = ((kcal - tdee) * 7) / KCAL_PER_KG_BODY_WEIGHT;

  let estimatedWeeks: number | null = null;
  let estimatedDate: string | null = null;
  const projection: ProjectionPoint[] = [{ week: 0, weightKg }];
  if (target != null && Math.abs(weeklyChangeKg) > 0.01) {
    estimatedWeeks = Math.ceil(Math.abs(target - weightKg) / Math.abs(weeklyChangeKg));
    const today = input.today ?? new Date();
    const d = new Date(today.getTime() + estimatedWeeks * 7 * 86_400_000);
    estimatedDate = d.toISOString().slice(0, 10);
    const weeks = Math.min(estimatedWeeks, MAX_PROJECTION_WEEKS);
    const step = Math.max(1, Math.ceil(weeks / 12));
    for (let w = step; w <= weeks; w += step) {
      const projected = weightKg + weeklyChangeKg * w;
      const clamped =
        weeklyChangeKg < 0 ? Math.max(target, projected) : Math.min(target, projected);
      projection.push({ week: w, weightKg: Math.round(clamped * 10) / 10 });
    }
    if (projection[projection.length - 1]?.week !== weeks) {
      projection.push({ week: weeks, weightKg: target });
    }
  }

  const macros = splitMacros({
    kcal,
    goal,
    weightKg,
    heightCm,
    dietaryPreferences: input.dietaryPreferences ?? [],
  });

  return {
    ok: true,
    plan: {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      kcal,
      macros,
      waterMl: waterTargetMl(weightKg),
      effectiveGoal: goal,
      weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100,
      estimatedWeeks,
      estimatedDate,
      warnings,
      projection,
    },
  };
}
