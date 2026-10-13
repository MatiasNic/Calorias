import { type Adapters, check, nullableNum, num, sinceFilter, upsertRows } from './shared';

/** Water, weight and body measurements. */
export const bodyAdapters: Adapters<'water' | 'weight' | 'measurements'> = {
  water: {
    push: upsertRows('water_logs', (userId, r, deletedAt) => ({
      ...r,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('water_logs').select('*'), since, page));
      return rows.map((row) => ({
        record: { id: row.id, logged_at: row.logged_at, local_date: row.local_date, ml: row.ml },
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }));
    },
  },
  weight: {
    push: upsertRows('weight_logs', (userId, r, deletedAt) => ({
      ...r,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('weight_logs').select('*'), since, page));
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
    push: upsertRows('body_measurements', (userId, r, deletedAt) => ({
      ...r,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _u, since, page) {
      const rows = check(await sinceFilter(sb.from('body_measurements').select('*'), since, page));
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
};
