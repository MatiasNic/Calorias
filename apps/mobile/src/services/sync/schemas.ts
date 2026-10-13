import { z } from 'zod';

import type { CollectionName } from '@/services/db/types';

/**
 * Shape checks for rows pulled from the server before they reach the local database. Columns are
 * already typed by Postgres; what can be malformed are the JSON columns (items, servings,
 * exercises, reminders…), which any client of the API could write. These schemas only check what
 * screens rely on to render (types, finite numbers, arrays); business limits stay in the forms.
 * Only used to accept or reject a row: the record itself is stored as pulled.
 */
const num = z.number().finite();
const str = z.string();
const nullableNum = num.nullable();

const nutrients = z.object({ kcal: num, protein_g: num, carbs_g: num, fat_g: num });
const mealItem = z.object({
  display_name: str,
  grams: num,
  per100g: nutrients,
  nutrients,
});
const dated = { id: str, local_date: str };

export const PULL_SCHEMAS: { [C in CollectionName]: z.ZodType } = {
  profile: z.object({ id: str, dietary_preferences: z.array(str), allergies: z.array(str) }),
  goals: z.object({
    id: str,
    kcal: num,
    protein_g: num,
    carbs_g: num,
    fat_g: num,
    effective_from: str,
  }),
  meals: z.object({
    ...dated,
    eaten_at: str,
    meal_type: str,
    items: z.array(mealItem),
    totals: nutrients,
  }),
  water: z.object({ ...dated, ml: num }),
  weight: z.object({ ...dated, weight_kg: num }),
  measurements: z.object({ ...dated }),
  foods_custom: z.object({
    id: str,
    name: str,
    per100g: nutrients,
    servings: z.array(z.object({ grams: num })),
  }),
  recipes: z.object({
    id: str,
    name: str,
    servings: num,
    items: z.array(z.object({ display_name: str, grams: num, per100g: nutrients })),
    totals: nutrients,
  }),
  favorites: z.object({ id: str, label: str, payload: z.object({ items: z.array(mealItem) }) }),
  achievements: z.object({ id: str, unlocked_at: str }),
  notification_settings: z.object({
    id: str,
    meal_reminders: z.record(str, z.object({ enabled: z.boolean(), time: str })),
    water_reminder: z.object({ enabled: z.boolean(), everyHours: num, from: str, to: str }),
    weigh_in_reminder: z.object({ enabled: z.boolean(), weekday: num, time: str }),
  }),
  streaks: z.object({ id: str, current_streak: num, longest_streak: num }),
  workouts: z.object({
    ...dated,
    duration_min: num,
    kcal: num,
    exercises: z.array(z.object({ key: str, sets: z.array(z.object({ reps: num, kg: num })) })),
  }),
  supplements: z.object({
    id: str,
    name: str,
    dose_amount: num,
    days: z.array(num),
    times: z.array(str),
    stock: nullableNum,
    nutrition: nutrients.nullable(),
  }),
  supplement_intakes: z.object({ ...dated, supplement_id: str, slot: str, dose_amount: num }),
};

/** Whether a pulled record has the shape the app needs. */
export function isValidPulledRecord(collection: CollectionName, record: unknown): boolean {
  return PULL_SCHEMAS[collection].safeParse(record).success;
}
