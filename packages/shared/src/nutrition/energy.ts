import { ACTIVITY_FACTORS } from '../constants.ts';
import type { ActivityLevel, Sex } from '../schemas/enums.ts';

export interface BodyStats {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
}

/** Basal metabolic rate using the Mifflin-St Jeor equation (kcal/day). */
export function bmrMifflinStJeor({ sex, ageYears, heightCm, weightKg }: BodyStats): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

/** Total daily energy expenditure = BMR × activity factor. */
export function tdee(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Weight (kg) corresponding to a given BMI at a given height. */
export function weightForBmi(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return targetBmi * m * m;
}

/** Age in full years at `on` (defaults to now). `birthDate` is an ISO date (YYYY-MM-DD). */
export function ageFromBirthDate(birthDate: string, on: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  let age = on.getUTCFullYear() - y;
  const monthDiff = on.getUTCMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < d)) age -= 1;
  return age;
}
