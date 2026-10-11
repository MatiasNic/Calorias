import {
  suggestMealType,
  type AnalyzeResponse,
  type IsoDate,
  type MealItem,
  type MealType,
} from '@plato/shared';

import { makeItem } from '@/features/diary/mealMath';
import type { MealDraft } from '@/features/diary/draftStore';
import { todayLocal } from '@/utils/dates';

export function itemsFromAnalysis(r: AnalyzeResponse): MealItem[] {
  return analysisToItems(r).items;
}

/** Items plus, when the description covered several meals, the meal of each item. */
export function analysisToItems(r: AnalyzeResponse): {
  items: MealItem[];
  itemMeals: Record<string, MealType>;
} {
  const items = r.items.map((i) =>
    makeItem(
      { id: i.food_id, source: i.food_source, name: i.display_name, per100g: i.per100g },
      i.grams,
      {
        serving_unit: i.household_measure,
        ai_confidence: i.confidence,
        cooking_method: i.cooking_method,
      },
    ),
  );
  const types = new Set(r.items.map((i) => i.meal_type).filter(Boolean));
  const itemMeals: Record<string, MealType> = {};
  if (types.size > 1)
    r.items.forEach((i, idx) => {
      const id = items[idx]?.id;
      if (id && i.meal_type) itemMeals[id] = i.meal_type;
    });
  return { items, itemMeals };
}

export function draftFromAnalysis(
  r: AnalyzeResponse,
  opts: {
    source: MealDraft['source'];
    mealType?: MealType | null;
    photoPath?: string | null;
    localPhotoUri?: string | null;
    /** Day the meal belongs to (defaults to today). */
    date?: IsoDate | null;
  },
): MealDraft {
  const now = new Date();
  const { items, itemMeals } = analysisToItems(r);
  return {
    mealId: null,
    date: opts.date ?? todayLocal(),
    time: { h: now.getHours(), m: now.getMinutes() },
    mealType: opts.mealType ?? suggestMealType(now.getHours()),
    source: opts.source,
    items,
    photoPath: opts.photoPath ?? null,
    localPhotoUri: opts.localPhotoUri ?? null,
    aiScanId: r.scan_id,
    dishName: r.dish_name,
    hiddenQuestion: r.hidden_ingredients_question,
    quickAnswers: r.quick_answers,
    itemMeals,
    notes: r.notes,
    original: items,
  };
}
