import type { Json } from '@/services/supabase/database.types';
import type { CollectionMap } from '@/services/db/types';
import { type Adapters, check, nullableNum, num, sinceFilter, upsertRows } from './shared';

/** Profile, goals, reminders, streak and achievements (one row per user or per goal). */
export const accountAdapters: Adapters<
  'profile' | 'goals' | 'notification_settings' | 'streaks' | 'achievements'
> = {
  profile: {
    push: upsertRows('profiles', (userId, r) => {
      const { id: _id, ...rest } = r;
      return { ...rest, id: userId };
    }),
    async pull(sb, userId, since, page) {
      const rows = check(
        await sinceFilter(sb.from('profiles').select('*').eq('id', userId), since, page),
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
    push: upsertRows('goals', (userId, r, deletedAt) => ({
      ...r,
      user_id: userId,
      deleted_at: deletedAt,
    })),
    async pull(sb, _userId, since, page) {
      const rows = check(await sinceFilter(sb.from('goals').select('*'), since, page));
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
  notification_settings: {
    push: upsertRows('notification_settings', (userId, r) => {
      const { id: _id, ...rest } = r;
      return {
        ...rest,
        meal_reminders: rest.meal_reminders as unknown as NonNullable<Json>,
        water_reminder: rest.water_reminder as unknown as NonNullable<Json>,
        weigh_in_reminder: rest.weigh_in_reminder as unknown as NonNullable<Json>,
        user_id: userId,
      };
    }),
    async pull(sb, userId, since, page) {
      const rows = check(
        await sinceFilter(
          sb.from('notification_settings').select('*').eq('user_id', userId),
          since,
          page,
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
    push: upsertRows('streaks', (userId, r) => {
      const { id: _id, ...rest } = r;
      return { ...rest, user_id: userId };
    }),
    async pull(sb, userId, since, page) {
      const rows = check(
        await sinceFilter(sb.from('streaks').select('*').eq('user_id', userId), since, page),
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
  achievements: {
    push: upsertRows(
      'achievements',
      (userId, r) => ({ user_id: userId, achievement_id: r.id, unlocked_at: r.unlocked_at }),
      'user_id,achievement_id',
    ),
    async pull(sb, _u, _since, page) {
      // Small and append-only: read whole, once.
      if (page > 0) return [];
      const rows = check(await sb.from('achievements').select('*'));
      return rows.map((row) => ({
        record: { id: row.achievement_id, unlocked_at: row.unlocked_at },
        updatedAt: row.unlocked_at,
        deletedAt: null,
      }));
    },
  },
};
