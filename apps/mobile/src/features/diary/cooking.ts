import type { CookingMethod, MealItem } from '@plato/shared';

import { withGrams } from './mealMath';

/**
 * Heuristic fat adjustment when the user corrects the cooking method of an AI-estimated item:
 * deep/shallow frying adds roughly 5 g of absorbed fat per 100 g of food (USDA retention data
 * for breaded/battered items ranges ~3–8 g). Documented as an estimate in the review UI.
 */
export const FRYING_FAT_G_PER_100G = 5;
const FRIED: readonly CookingMethod[] = ['fried', 'deep_fried'];

export function applyCookingMethod(item: MealItem, method: CookingMethod): MealItem {
  const prev = item.cooking_method ?? 'unknown';
  if (prev === method) return item;
  const wasFried = FRIED.includes(prev);
  const isFried = FRIED.includes(method);
  let per100g = item.per100g;
  if (wasFried !== isFried) {
    const delta = isFried ? FRYING_FAT_G_PER_100G : -FRYING_FAT_G_PER_100G;
    const fat = Math.max(0, item.per100g.fat_g + delta);
    const appliedDelta = fat - item.per100g.fat_g;
    per100g = {
      ...item.per100g,
      fat_g: fat,
      kcal: Math.max(0, Math.round(item.per100g.kcal + appliedDelta * 9)),
    };
  }
  return withGrams({ ...item, per100g, cooking_method: method }, item.grams);
}

export const COOKING_CHOICES: readonly CookingMethod[] = [
  'fried',
  'baked',
  'grilled',
  'boiled',
  'raw',
];

/** Hidden fats/sauces the user can add with one tap: regional food id + grams. */
export const HIDDEN_EXTRAS = [
  { id: 'aceite_girasol', grams: 13, key: 'oil' },
  { id: 'manteca', grams: 5, key: 'butter' },
  { id: 'mayonesa', grams: 14, key: 'mayo' },
  { id: 'chimichurri', grams: 15, key: 'dressing' },
] as const;

/** Items whose cooking method the user can answer in the review (AI said it's cooked/unsure). */
export function isCookable(item: MealItem): boolean {
  return item.cooking_method != null && item.cooking_method !== 'raw';
}

/** The quick choices for an item, keeping the AI's own method visible when it isn't one of them. */
export function cookingChoicesFor(item: MealItem): readonly CookingMethod[] {
  const current = item.cooking_method;
  if (!current || current === 'unknown' || COOKING_CHOICES.includes(current)) {
    return COOKING_CHOICES;
  }
  return [current, ...COOKING_CHOICES];
}
