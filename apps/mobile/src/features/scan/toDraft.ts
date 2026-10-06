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
  return r.items.map((i) =>
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
  const items = itemsFromAnalysis(r);
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
    notes: r.notes,
    original: items,
  };
}
