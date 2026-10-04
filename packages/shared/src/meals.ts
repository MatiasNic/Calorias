import type { MealType } from './schemas/enums.ts';

/** Hour boundaries (local time) used to suggest a meal type. Argentine eating schedule. */
export const MEAL_TIME_WINDOWS: readonly { type: MealType; fromHour: number; toHour: number }[] = [
  { type: 'breakfast', fromHour: 5, toHour: 11 },
  { type: 'lunch', fromHour: 11, toHour: 16 },
  { type: 'snack', fromHour: 16, toHour: 20 },
  { type: 'dinner', fromHour: 20, toHour: 24 },
];

export function suggestMealType(hour: number): MealType {
  const w = MEAL_TIME_WINDOWS.find((x) => hour >= x.fromHour && hour < x.toHour);
  return w?.type ?? 'other';
}
