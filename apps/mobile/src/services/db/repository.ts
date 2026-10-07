import * as Crypto from 'expo-crypto';

import { currentUserId } from '@/stores/session';
import { getDb } from './database';
import type { CollectionMap, CollectionName } from './types';

type Listener = (collection: CollectionName) => void;
const listeners = new Set<Listener>();

/** Notifies subscribers (TanStack Query invalidation, sync scheduler) about local writes. */
export const dbEvents = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(collection: CollectionName) {
    listeners.forEach((fn) => fn(collection));
  },
};

/** Which field provides the indexed local date for each collection (if any). */
const DATE_FIELD: Partial<Record<CollectionName, string>> = {
  meals: 'local_date',
  water: 'local_date',
  weight: 'local_date',
  measurements: 'local_date',
  goals: 'effective_from',
  workouts: 'local_date',
  supplement_intakes: 'local_date',
};

interface Row {
  id: string;
  data: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: number;
  user_id: string;
}

export interface StoredRecord<T> {
  record: T;
  updatedAt: string;
  deletedAt: string | null;
  dirty: boolean;
}

export const newId = () => Crypto.randomUUID();
const nowIso = () => new Date().toISOString();

function dateOf(collection: CollectionName, record: object): string | null {
  const field = DATE_FIELD[collection];
  if (!field) return null;
  const v = (record as Record<string, unknown>)[field];
  return typeof v === 'string' ? v.slice(0, 10) : null;
}

export function collection<C extends CollectionName>(name: C) {
  type T = CollectionMap[C];

  return {
    name,

    async get(id: string): Promise<T | null> {
      const row = await (
        await getDb()
      ).getFirstAsync<Row>(
        'SELECT * FROM records WHERE collection = ? AND id = ? AND deleted_at IS NULL',
        [name, id],
      );
      return row ? (JSON.parse(row.data) as T) : null;
    },

    /** Records ordered by local date (if the collection has one) then id. */
    async list(range?: { from?: string; to?: string }): Promise<T[]> {
      const where = ['collection = ?', 'deleted_at IS NULL'];
      const params: string[] = [name];
      if (range?.from) {
        where.push('local_date >= ?');
        params.push(range.from);
      }
      if (range?.to) {
        where.push('local_date <= ?');
        params.push(range.to);
      }
      const rows = await (
        await getDb()
      ).getAllAsync<Row>(
        `SELECT data FROM records WHERE ${where.join(' AND ')} ORDER BY local_date, updated_at`,
        params,
      );
      return rows.map((r) => JSON.parse(r.data) as T);
    },

    async count(): Promise<number> {
      const r = await (
        await getDb()
      ).getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) as n FROM records WHERE collection = ? AND deleted_at IS NULL',
        [name],
      );
      return r?.n ?? 0;
    },

    /** Distinct local dates that have at least one record. */
    async dates(): Promise<string[]> {
      const rows = await (
        await getDb()
      ).getAllAsync<{ d: string }>(
        'SELECT DISTINCT local_date as d FROM records WHERE collection = ? AND deleted_at IS NULL AND local_date IS NOT NULL ORDER BY d',
        [name],
      );
      return rows.map((r) => r.d);
    },

    /** Local write: marks the record dirty so the sync engine pushes it. */
    async upsert(record: T): Promise<T> {
      await (
        await getDb()
      ).runAsync(
        `INSERT INTO records (collection, id, user_id, local_date, data, updated_at, deleted_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, NULL, 1)
         ON CONFLICT (collection, id) DO UPDATE SET
           local_date = excluded.local_date, data = excluded.data, updated_at = excluded.updated_at,
           deleted_at = NULL, dirty = 1`,
        [name, record.id, currentUserId(), dateOf(name, record), JSON.stringify(record), nowIso()],
      );
      dbEvents.emit(name);
      return record;
    },

    /** Soft delete (propagated to the server as deleted_at). */
    async remove(id: string): Promise<void> {
      await (
        await getDb()
      ).runAsync(
        'UPDATE records SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE collection = ? AND id = ?',
        [nowIso(), nowIso(), name, id],
      );
      dbEvents.emit(name);
    },

    // ── sync engine helpers ──
    async dirty(): Promise<StoredRecord<T>[]> {
      const rows = await (
        await getDb()
      ).getAllAsync<Row>('SELECT * FROM records WHERE collection = ? AND dirty = 1', [name]);
      return rows.map((r) => ({
        record: JSON.parse(r.data) as T,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
        dirty: true,
      }));
    },

    async markClean(id: string, updatedAt: string): Promise<void> {
      await (
        await getDb()
      ).runAsync(
        'UPDATE records SET dirty = 0 WHERE collection = ? AND id = ? AND updated_at = ?',
        [name, id, updatedAt],
      );
    },

    /** Applies a server row unless there is a pending local change (local wins until pushed). */
    async applyRemote(record: T, deletedAt: string | null, serverUpdatedAt: string): Promise<void> {
      await (
        await getDb()
      ).runAsync(
        `INSERT INTO records (collection, id, user_id, local_date, data, updated_at, deleted_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT (collection, id) DO UPDATE SET
           local_date = excluded.local_date, data = excluded.data, updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at, dirty = 0
         WHERE records.dirty = 0`,
        [
          name,
          record.id,
          currentUserId(),
          dateOf(name, record),
          JSON.stringify(record),
          serverUpdatedAt,
          deletedAt,
        ],
      );
    },
  };
}

export type Collection<C extends CollectionName> = ReturnType<typeof collection<C>>;

/** Re-assigns guest data to a newly created account and queues everything for upload. */
export async function adoptGuestData(newUserId: string, guestId: string) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    // Singleton collections are keyed by the user id.
    for (const c of SINGLETONS) {
      await db.runAsync(`DELETE FROM records WHERE collection = ? AND id = ?`, [c, newUserId]);
      await db.runAsync(
        `UPDATE records SET id = ?, data = json_set(data, '$.id', ?) WHERE collection = ? AND id = ?`,
        [newUserId, newUserId, c, guestId],
      );
    }
    await db.runAsync('UPDATE records SET user_id = ?, dirty = 1', [newUserId]);
  });
}

/** Collections with a single record per user, whose id is the user id. */
export const SINGLETONS: readonly CollectionName[] = [
  'profile',
  'notification_settings',
  'streaks',
];

export async function pendingChangesCount(): Promise<number> {
  const r = await (
    await getDb()
  ).getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM records WHERE dirty = 1');
  return r?.n ?? 0;
}

export const repos = {
  profile: collection('profile'),
  goals: collection('goals'),
  meals: collection('meals'),
  water: collection('water'),
  weight: collection('weight'),
  measurements: collection('measurements'),
  foodsCustom: collection('foods_custom'),
  recipes: collection('recipes'),
  favorites: collection('favorites'),
  achievements: collection('achievements'),
  notificationSettings: collection('notification_settings'),
  streaks: collection('streaks'),
  workouts: collection('workouts'),
  supplements: collection('supplements'),
  supplementIntakes: collection('supplement_intakes'),
};
