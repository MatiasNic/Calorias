import { ageFromBirthDate, computeGoalPlan, type GoalPlanResult } from '@plato/shared';

import { birthDateIso, type OnboardingAnswers } from './store';

export function planFromAnswers(a: OnboardingAnswers): GoalPlanResult | null {
  const birth = birthDateIso(a);
  if (!a.goal || !a.sex || !birth || !a.heightCm || !a.weightKg || !a.activity) return null;
  return computeGoalPlan({
    sex: a.sex,
    ageYears: ageFromBirthDate(birth),
    heightCm: a.heightCm,
    weightKg: a.weightKg,
    targetWeightKg: a.targetWeightKg,
    activity: a.activity,
    goal: a.goal,
    weeklyRateKg: a.weeklyRateKg,
    dietaryPreferences: a.dietaryPreferences,
  });
}
