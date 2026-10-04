import {
  per100FromTotals,
  scaleNutrients,
  sumNutrients,
  type IsoDate,
  type MealType,
} from '@plato/shared';

import { saveMeal } from '@/features/diary/hooks';
import { makeItem } from '@/features/diary/mealMath';
import { newId, repos } from '@/services/db/repository';
import type { RecipeItem, RecipeRecord } from '@/services/db/types';

export function recipeTotals(items: readonly RecipeItem[]) {
  const totals = sumNutrients(items.map((i) => scaleNutrients(i.per100g, i.grams)));
  const totalGrams = items.reduce((s, i) => s + i.grams, 0);
  return { totals, totalGrams };
}

export async function saveRecipe(input: {
  id: string | null;
  name: string;
  servings: number;
  items: RecipeItem[];
  note?: string | null;
}) {
  const { totals, totalGrams } = recipeTotals(input.items);
  const record: RecipeRecord = {
    id: input.id ?? newId(),
    name: input.name.trim(),
    servings: input.servings,
    note: input.note ?? null,
    items: input.items,
    total_grams: totalGrams,
    totals,
  };
  return repos.recipes.upsert(record);
}

/** Logs N servings of a recipe as a single diary item (per-100 g derived from the recipe totals). */
export async function logRecipe(
  recipe: RecipeRecord,
  servings: number,
  date: IsoDate,
  mealType: MealType,
) {
  const grams = (recipe.total_grams / recipe.servings) * servings;
  const per100g = per100FromTotals(recipe.totals, recipe.total_grams);
  const item = {
    ...makeItem({ id: recipe.id, source: 'recipe', name: recipe.name, per100g }, grams),
    serving_qty: servings,
    serving_unit: 'serving',
  };
  return saveMeal({ date, mealType, source: 'recipe', items: [item] });
}
