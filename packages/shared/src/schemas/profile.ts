import { z } from 'zod';
import {
  ActivityLevelSchema,
  DietaryPreferenceSchema,
  GoalModeSchema,
  GoalTypeSchema,
  LocaleSchema,
  SexSchema,
  UnitSystemSchema,
} from './enums.ts';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date');

/** Onboarding answers (validated in the app with react-hook-form and on the server). */
export const OnboardingSchema = z.object({
  goal: GoalTypeSchema,
  sex: SexSchema,
  birthDate: isoDate,
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(350),
  targetWeightKg: z.number().min(30).max(350).nullable(),
  activity: ActivityLevelSchema,
  weeklyRateKg: z.number().min(0).max(1.5).nullable(),
  dietaryPreferences: z.array(DietaryPreferenceSchema).default([]),
  allergies: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  unitSystem: UnitSystemSchema.default('metric'),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().max(80).nullable(),
  birth_date: isoDate.nullable(),
  sex: SexSchema.nullable(),
  height_cm: z.number().nullable(),
  unit_system: UnitSystemSchema,
  activity_level: ActivityLevelSchema.nullable(),
  goal_type: GoalTypeSchema.nullable(),
  weekly_rate_kg: z.number().nullable(),
  target_weight_kg: z.number().nullable(),
  dietary_preferences: z.array(DietaryPreferenceSchema),
  allergies: z.array(z.string()),
  timezone: z.string(),
  locale: LocaleSchema,
  country: z.string().length(2).nullable(),
  onboarding_completed: z.boolean(),
  save_photos: z.boolean(),
  analytics_consent: z.boolean(),
  terms_accepted_at: z.string().nullable(),
  terms_version: z.string().nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const GoalRecordSchema = z.object({
  id: z.string().uuid().optional(),
  kcal: z.number().int().min(800).max(6000),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fiber_g: z.number().min(0).nullable(),
  water_ml: z.number().int().min(0).nullable(),
  mode: GoalModeSchema,
  effective_from: isoDate,
  tdee_estimate: z.number().nullable().optional(),
});
export type GoalRecord = z.infer<typeof GoalRecordSchema>;
