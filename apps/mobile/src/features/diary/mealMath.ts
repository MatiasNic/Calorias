import {
  clampGrams,
  scaleMicros,
  scaleNutrients,
  sumNutrients,
  type CookingMethod,
  type FoodSource,
  type MealItem,
  type Micronutrients,
  type Nutrients,
} from '@plato/shared';

import { newId } from '@/services/db/repository';

export interface FoodLike {
  id: string | null;
  source: FoodSource;
  name: string;
  per100g: Nutrients;
  micros?: Micronutrients;
}

export function makeItem(
  food: FoodLike,
  grams: number,
  extra: {
    serving_unit?: string | null;
    serving_qty?: number | null;
    ai_confidence?: number | null;
    cooking_method?: CookingMethod | null;
  } = {},
): MealItem {
  const g = clampGrams(grams);
  return {
    id: newId(),
    display_name: food.name,
    food_id: food.id,
    food_source: food.source,
    grams: g,
    serving_unit: extra.serving_unit ?? null,
    serving_qty: extra.serving_qty ?? null,
    per100g: food.per100g,
    nutrients: scaleNutrients(food.per100g, g),
    micros: scaleMicros(food.micros, g),
    ai_confidence: extra.ai_confidence ?? null,
    cooking_method: extra.cooking_method ?? null,
    user_edited: false,
  };
}

/** Returns a copy of the item with new grams (nutrients rescaled from per-100 g). */
export function withGrams(item: MealItem, grams: number, edited = true): MealItem {
  const g = clampGrams(grams);
  const factor = item.grams > 0 ? g / item.grams : 0;
  return {
    ...item,
    grams: g,
    nutrients: scaleNutrients(item.per100g, g),
    micros: item.micros
      ? Object.fromEntries(
          Object.entries(item.micros).map(([k, v]) => [k, Math.round(v * factor * 100) / 100]),
        )
      : item.micros,
    serving_qty:
      item.serving_qty != null && item.grams > 0
        ? Math.round(item.serving_qty * factor * 100) / 100
        : item.serving_qty,
    user_edited: edited || item.user_edited,
  };
}

export function mealTotals(items: readonly MealItem[]): Nutrients {
  return sumNutrients(items.map((i) => i.nutrients));
}

/** Calories added by cooking fat not visible in the photo (per tbsp of oil ≈ 13 g). */
export const OIL_TBSP_GRAMS = 13;
