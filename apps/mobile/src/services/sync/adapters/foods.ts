import type { Json } from '@/services/supabase/database.types';
import type { CollectionMap } from '@/services/db/types';
import {
  type Adapters,
  check,
  json,
  num,
  nutrientColumns,
  nutrientsFrom,
  sinceFilter,
  upsertRows,
} from './shared';

/** Custom foods, recipes and favorites. */
export const foodsAdapters: Adapters<'foods_custom' | 'recipes' | 'favorites'> = {
  foods_custom: {
    push: upsertRows('foods_custom', (userId, r, deletedAt) => ({
      id: r.id,
      user_id: userId,
      name: r.name,
      brand: r.brand,
      barcode: r.barcode,
      ...nutrientColumns(r.per100g),
      micros: json(r.micros ?? {}),
      servings: r.servings as unknown as NonNullable<Json>,
      origin: r.origin,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('foods_custom').select('*'), since, page));
      return rows.map((row) => ({
        record: {
          id: row.id,
          name: row.name,
          brand: row.brand,
          barcode: row.barcode,
          per100g: nutrientsFrom(row),
          micros: (row.micros ?? {}) as Record<string, number>,
          servings: (row.servings ?? []) as unknown as CollectionMap['foods_custom']['servings'],
          origin: row.origin as CollectionMap['foods_custom']['origin'],
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  recipes: {
    push: upsertRows('recipes', (userId, r, deletedAt) => ({
      id: r.id,
      user_id: userId,
      name: r.name,
      servings: r.servings,
      note: r.note,
      items: r.items as unknown as NonNullable<Json>,
      total_grams: r.total_grams,
      kcal: r.totals.kcal,
      protein_g: r.totals.protein_g,
      carbs_g: r.totals.carbs_g,
      fat_g: r.totals.fat_g,
      fiber_g: r.totals.fiber_g ?? 0,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('recipes').select('*'), since, page));
      return rows.map((row) => ({
        record: {
          id: row.id,
          name: row.name,
          servings: num(row.servings),
          note: row.note,
          items: row.items as unknown as CollectionMap['recipes']['items'],
          total_grams: num(row.total_grams),
          totals: nutrientsFrom(row),
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  favorites: {
    push: upsertRows('favorites', (userId, r, deletedAt) => ({
      id: r.id,
      user_id: userId,
      kind: r.kind,
      label: r.label,
      payload: r.payload as unknown as NonNullable<Json>,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('favorites').select('*'), since, page));
      return rows.map((row) => ({
        record: {
          id: row.id,
          kind: row.kind as 'food' | 'meal',
          label: row.label,
          payload: row.payload as unknown as CollectionMap['favorites']['payload'],
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
};
