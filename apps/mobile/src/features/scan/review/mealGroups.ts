import { timeForMealType, type MealItem, type MealType } from '@plato/shared';

import type { MealDraft } from '@/features/diary/draftStore';

/** Meal an item of the draft belongs to (several meals in one description, or the draft's). */
export function mealOfItem(draft: MealDraft | null, item: MealItem): MealType {
  return (item.id ? draft?.itemMeals[item.id] : undefined) ?? draft?.mealType ?? 'other';
}

/** Time of one meal: its own (or usual) time when the draft has several, else the draft's. */
export function mealTimeOf(
  draft: MealDraft,
  mealType: MealType,
  multiMeal: boolean,
  now: Date,
): { h: number; m: number } {
  return multiMeal ? (draft.groupTimes[mealType] ?? timeForMealType(mealType, now)) : draft.time;
}
