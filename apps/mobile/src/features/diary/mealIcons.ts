import type { MealType } from '@plato/shared';

import type { SymbolName } from '@/components/Icon';

/** Icon of each meal (design: desayuno ☕, almuerzo 🍔, merienda, cena 🌙). */
export const MEAL_ICONS: Record<MealType, SymbolName> = {
  breakfast: 'coffee',
  lunch: 'lunch_dining',
  snack: 'local_cafe',
  dinner: 'dark_mode',
  other: 'restaurant',
};
