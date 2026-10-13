import type { MealType } from '@bocado/shared';

import type { SymbolName } from '@/components/Icon';
import type { ThemeColors } from '@/theme';

/** Icon of each meal (design: desayuno ☕, almuerzo 🍔, merienda, cena 🌙). */
export const MEAL_ICONS: Record<MealType, SymbolName> = {
  breakfast: 'coffee',
  lunch: 'lunch_dining',
  snack: 'local_cafe',
  dinner: 'dark_mode',
  other: 'restaurant',
};

/** Tint of each meal's icon tile in the diary (theme tokens, never macro colors). */
export const MEAL_TINTS: Record<MealType, keyof ThemeColors> = {
  breakfast: 'mealBreakfast',
  lunch: 'mealLunch',
  snack: 'mealSnack',
  dinner: 'mealDinner',
  other: 'mealOther',
};
