import { type MealItem, type Nutrients } from '@plato/shared';

import type { CollectionMap } from '@/services/db/types';
import { type Adapters, check, json, nullableNum, num, nutrientsFrom, sinceFilter } from './shared';

/** Meals with their items, saved through the upsert_meal(s) RPCs (atomic per meal). */
export const mealsAdapters: Adapters<'meals'> = {
  meals: {
    async push(sb, _userId, items) {
      const payloads = items.map(({ record: r, deletedAt }) => ({
        id: r.id,
        eaten_at: r.eaten_at,
        local_date: r.local_date,
        meal_type: r.meal_type,
        source: r.source,
        photo_path: r.photo_path,
        note: r.note,
        ai_scan_id: r.ai_scan_id,
        deleted_at: deletedAt,
        items: r.items,
      }));
      // One meal: the original RPC (also works against a backend without upsert_meals).
      if (payloads.length === 1) check(await sb.rpc('upsert_meal', { p: json(payloads[0]) }));
      else check(await sb.rpc('upsert_meals', { p: json(payloads) }));
    },
    async pull(sb, _userId, since, page) {
      const rows = check(
        await sinceFilter(sb.from('meals').select('*, meal_items(*)'), since, page),
      );
      return rows.map((row) => {
        const items: MealItem[] = [...(row.meal_items ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((i) => ({
            id: i.id,
            display_name: i.display_name,
            food_id: i.food_id,
            food_source: i.food_source as MealItem['food_source'],
            grams: num(i.grams),
            serving_unit: i.serving_unit,
            serving_qty: nullableNum(i.serving_qty),
            per100g: i.per100g as unknown as Nutrients,
            nutrients: nutrientsFrom(i),
            micros: (i.micros ?? {}) as Record<string, number>,
            ai_confidence: nullableNum(i.ai_confidence),
            cooking_method: i.cooking_method as MealItem['cooking_method'],
            user_edited: i.user_edited,
          }));
        return {
          record: {
            id: row.id,
            eaten_at: row.eaten_at,
            local_date: row.local_date,
            meal_type: row.meal_type as CollectionMap['meals']['meal_type'],
            source: row.source as CollectionMap['meals']['source'],
            photo_path: row.photo_path,
            local_photo_uri: null,
            note: row.note,
            ai_scan_id: row.ai_scan_id,
            items,
            totals: nutrientsFrom(row),
          },
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        };
      });
    },
  },
};
