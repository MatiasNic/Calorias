import type { Json } from '@/services/supabase/database.types';
import type { CollectionMap } from '@/services/db/types';
import { type Adapters, check, json, nullableNum, num, sinceFilter, upsertRows } from './shared';

/** Workouts, supplements and supplement intakes. */
export const trainingAdapters: Adapters<'workouts' | 'supplements' | 'supplement_intakes'> = {
  workouts: {
    push: upsertRows('workouts', (userId, r, deletedAt) => ({
      ...r,
      exercises: r.exercises as unknown as NonNullable<Json>,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('workouts').select('*'), since, page));
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
    push: upsertRows('supplements', (userId, r, deletedAt) => ({
      ...r,
      nutrition: r.nutrition ? json(r.nutrition) : null,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('supplements').select('*'), since, page));
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
    push: upsertRows('supplement_intakes', (userId, r, deletedAt) => ({
      ...r,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('supplement_intakes').select('*'), since, page));
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
