import type { MealItem, Nutrients } from '@plato/shared';

import type { TypedSupabaseClient } from '@/services/supabase/client';
import type { Json } from '@/services/supabase/database.types';
import type { CollectionMap, CollectionName } from '@/services/db/types';

/**
 * Maps local records ⇄ Supabase rows. Each adapter knows how to push one dirty record and how to
 * pull rows changed since a timestamp.
 */
export interface RemoteRow<T> {
  record: T;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Adapter<C extends CollectionName> {
  push(
    sb: TypedSupabaseClient,
    userId: string,
    record: CollectionMap[C],
    deletedAt: string | null,
  ): Promise<void>;
  pull(
    sb: TypedSupabaseClient,
    userId: string,
    since: string | null,
  ): Promise<RemoteRow<CollectionMap[C]>[]>;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const optNum = (v: unknown): number | undefined => (v == null ? undefined : Number(v));
const nullableNum = (v: unknown): number | null => (v == null ? null : Number(v));

function check<T>(res: { data: T | null; error: { message: string } | null }): NonNullable<T> | [] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

const json = (v: unknown) => v as NonNullable<Json>;

function nutrientColumns(n: Nutrients) {
  return {
    kcal: n.kcal,
    protein_g: n.protein_g,
    carbs_g: n.carbs_g,
    fat_g: n.fat_g,
    fiber_g: n.fiber_g ?? null,
    sugar_g: n.sugar_g ?? null,
    sodium_mg: n.sodium_mg ?? null,
    sat_fat_g: n.sat_fat_g ?? null,
  };
}

function nutrientsFrom(row: Record<string, unknown>): Nutrients {
  return {
    kcal: num(row.kcal),
    protein_g: num(row.protein_g),
    carbs_g: num(row.carbs_g),
    fat_g: num(row.fat_g),
    fiber_g: optNum(row.fiber_g),
    sugar_g: optNum(row.sugar_g),
    sodium_mg: optNum(row.sodium_mg),
    sat_fat_g: optNum(row.sat_fat_g),
  };
}

const sinceFilter = <Q extends { gt: (c: string, v: string) => Q }>(q: Q, since: string | null) =>
  since ? q.gt('updated_at', since) : q;

export const adapters: { [C in CollectionName]: Adapter<C> } = {
  profile: {
    async push(sb, userId, r) {
      const { id: _id, ...rest } = r;
      check(await sb.from('profiles').upsert({ ...rest, id: userId }));
    },
    async pull(sb, userId, since) {
      const rows = check(
        await sinceFilter(sb.from('profiles').select('*').eq('id', userId), since),
      );
      return rows.map((row) => ({
        record: {
          ...row,
          height_cm: nullableNum(row.height_cm),
          weekly_rate_kg: nullableNum(row.weekly_rate_kg),
          target_weight_kg: nullableNum(row.target_weight_kg),
        } as CollectionMap['profile'],
        updatedAt: row.updated_at,
        deletedAt: null,
      }));
    },
  },
  goals: {
    async push(sb, userId, r, deletedAt) {
      check(await sb.from('goals').upsert({ ...r, user_id: userId, deleted_at: deletedAt }));
    },
    async pull(sb, _userId, since) {
      const rows = check(await sinceFilter(sb.from('goals').select('*'), since));
      return rows.map((row) => ({
        record: {
          id: row.id,
          kcal: row.kcal,
          protein_g: num(row.protein_g),
          carbs_g: num(row.carbs_g),
          fat_g: num(row.fat_g),
          fiber_g: nullableNum(row.fiber_g),
          water_ml: row.water_ml,
          mode: row.mode as 'fixed' | 'adaptive',
          effective_from: row.effective_from,
          tdee_estimate: nullableNum(row.tdee_estimate),
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  meals: {
    async push(sb, _userId, r, deletedAt) {
      const payload = {
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
      };
      check(await sb.rpc('upsert_meal', { p: json(payload) }));
    },
    async pull(sb, _userId, since) {
      const rows = check(await sinceFilter(sb.from('meals').select('*, meal_items(*)'), since));
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
  water: {
    async push(sb, userId, r, deletedAt) {
      check(await sb.from('water_logs').upsert({ ...r, user_id: userId, deleted_at: deletedAt }));
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('water_logs').select('*'), since));
      return rows.map((row) => ({
        record: { id: row.id, logged_at: row.logged_at, local_date: row.local_date, ml: row.ml },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  weight: {
    async push(sb, userId, r, deletedAt) {
      check(await sb.from('weight_logs').upsert({ ...r, user_id: userId, deleted_at: deletedAt }));
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('weight_logs').select('*'), since));
      return rows.map((row) => ({
        record: {
          id: row.id,
          logged_at: row.logged_at,
          local_date: row.local_date,
          weight_kg: num(row.weight_kg),
          source: row.source as 'manual' | 'health',
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  measurements: {
    async push(sb, userId, r, deletedAt) {
      check(
        await sb.from('body_measurements').upsert({ ...r, user_id: userId, deleted_at: deletedAt }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('body_measurements').select('*'), since));
      return rows.map((row) => ({
        record: {
          id: row.id,
          measured_at: row.measured_at,
          local_date: row.local_date,
          waist_cm: nullableNum(row.waist_cm),
          hip_cm: nullableNum(row.hip_cm),
          chest_cm: nullableNum(row.chest_cm),
          body_fat_pct: nullableNum(row.body_fat_pct),
          photo_path: row.photo_path,
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  foods_custom: {
    async push(sb, userId, r, deletedAt) {
      check(
        await sb.from('foods_custom').upsert({
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
        }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('foods_custom').select('*'), since));
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
    async push(sb, userId, r, deletedAt) {
      check(
        await sb.from('recipes').upsert({
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
        }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('recipes').select('*'), since));
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
    async push(sb, userId, r, deletedAt) {
      check(
        await sb.from('favorites').upsert({
          id: r.id,
          user_id: userId,
          kind: r.kind,
          label: r.label,
          payload: r.payload as unknown as NonNullable<Json>,
          deleted_at: deletedAt,
        }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('favorites').select('*'), since));
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
  achievements: {
    async push(sb, userId, r) {
      check(
        await sb
          .from('achievements')
          .upsert(
            { user_id: userId, achievement_id: r.id, unlocked_at: r.unlocked_at },
            { onConflict: 'user_id,achievement_id' },
          ),
      );
    },
    async pull(sb) {
      const rows = check(await sb.from('achievements').select('*'));
      return rows.map((row) => ({
        record: { id: row.achievement_id, unlocked_at: row.unlocked_at },
        updatedAt: row.unlocked_at,
        deletedAt: null,
      }));
    },
  },
  notification_settings: {
    async push(sb, userId, r) {
      const { id: _id, ...rest } = r;
      check(
        await sb.from('notification_settings').upsert({
          ...rest,
          meal_reminders: rest.meal_reminders as unknown as NonNullable<Json>,
          water_reminder: rest.water_reminder as unknown as NonNullable<Json>,
          weigh_in_reminder: rest.weigh_in_reminder as unknown as NonNullable<Json>,
          user_id: userId,
        }),
      );
    },
    async pull(sb, userId, since) {
      const rows = check(
        await sinceFilter(
          sb.from('notification_settings').select('*').eq('user_id', userId),
          since,
        ),
      );
      return rows.map((row) => ({
        record: {
          id: userId,
          meal_reminders:
            row.meal_reminders as unknown as CollectionMap['notification_settings']['meal_reminders'],
          water_reminder:
            row.water_reminder as unknown as CollectionMap['notification_settings']['water_reminder'],
          weigh_in_reminder:
            row.weigh_in_reminder as unknown as CollectionMap['notification_settings']['weigh_in_reminder'],
          smart_reminders: row.smart_reminders,
          weekly_summary: row.weekly_summary,
        },
        updatedAt: row.updated_at,
        deletedAt: null,
      }));
    },
  },
  streaks: {
    async push(sb, userId, r) {
      const { id: _id, ...rest } = r;
      check(await sb.from('streaks').upsert({ ...rest, user_id: userId }));
    },
    async pull(sb, userId, since) {
      const rows = check(
        await sinceFilter(sb.from('streaks').select('*').eq('user_id', userId), since),
      );
      return rows.map((row) => ({
        record: {
          id: userId,
          current_streak: row.current_streak,
          longest_streak: row.longest_streak,
          last_logged_date: row.last_logged_date,
        },
        updatedAt: row.updated_at,
        deletedAt: null,
      }));
    },
  },
  workouts: {
    async push(sb, userId, r, deletedAt) {
      check(
        await sb.from('workouts').upsert({
          ...r,
          exercises: r.exercises as unknown as NonNullable<Json>,
          user_id: userId,
          deleted_at: deletedAt,
        }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('workouts').select('*'), since));
      return rows.map((row) => ({
        record: {
          id: row.id,
          started_at: row.started_at,
          local_date: row.local_date,
          activity: row.activity,
          title: row.title,
          duration_min: row.duration_min,
          intensity: row.intensity as CollectionMap['workouts']['intensity'],
          kcal: num(row.kcal),
          kcal_source: row.kcal_source as CollectionMap['workouts']['kcal_source'],
          distance_km: nullableNum(row.distance_km),
          exercises: (row.exercises ?? []) as unknown as CollectionMap['workouts']['exercises'],
          rpe: nullableNum(row.rpe),
          note: row.note,
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  supplements: {
    async push(sb, userId, r, deletedAt) {
      check(
        await sb.from('supplements').upsert({
          ...r,
          nutrition: r.nutrition ? json(r.nutrition) : null,
          user_id: userId,
          deleted_at: deletedAt,
        }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('supplements').select('*'), since));
      return rows.map((row) => ({
        record: {
          id: row.id,
          name: row.name,
          preset: row.preset,
          dose_amount: num(row.dose_amount),
          dose_unit: row.dose_unit as CollectionMap['supplements']['dose_unit'],
          days: (row.days ?? []).map(Number),
          times: row.times ?? [],
          reminders: row.reminders,
          stock: nullableNum(row.stock),
          low_stock_threshold: nullableNum(row.low_stock_threshold),
          nutrition: (row.nutrition ?? null) as CollectionMap['supplements']['nutrition'],
          count_in_macros: row.count_in_macros,
          active: row.active,
          start_date: row.start_date,
          note: row.note,
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  supplement_intakes: {
    async push(sb, userId, r, deletedAt) {
      check(
        await sb
          .from('supplement_intakes')
          .upsert({ ...r, user_id: userId, deleted_at: deletedAt }),
      );
    },
    async pull(sb, _u, since) {
      const rows = check(await sinceFilter(sb.from('supplement_intakes').select('*'), since));
      return rows.map((row) => ({
        record: {
          id: row.id,
          supplement_id: row.supplement_id,
          taken_at: row.taken_at,
          local_date: row.local_date,
          slot: row.slot,
          dose_amount: num(row.dose_amount),
          meal_id: row.meal_id,
        },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
};

/** Push order matters for FKs and for the server-side profile timezone used by quotas. */
export const SYNC_ORDER: readonly CollectionName[] = [
  'profile',
  'goals',
  'notification_settings',
  'meals',
  'water',
  'weight',
  'measurements',
  'foods_custom',
  'recipes',
  'favorites',
  'achievements',
  'streaks',
  'workouts',
  // supplement_intakes.supplement_id → supplements(id): parents first.
  'supplements',
  'supplement_intakes',
];
