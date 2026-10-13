import type { Nutrients } from '@bocado/shared';

import type { CollectionMap, CollectionName } from '@/services/db/types';
import type { TypedSupabaseClient } from '@/services/supabase/client';
import type { Database, Json, TablesInsert } from '@/services/supabase/database.types';

/**
 * Maps local records ⇄ Supabase rows. Each adapter uploads a batch of dirty records and pulls
 * rows changed since a timestamp, one page at a time.
 */
export interface RemoteRow<T> {
  record: T;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PushItem<T> {
  record: T;
  deletedAt: string | null;
}

export interface Adapter<C extends CollectionName> {
  /** Uploads records in as few requests as possible; all or nothing (the engine retries one by one). */
  push(
    sb: TypedSupabaseClient,
    userId: string,
    items: readonly PushItem<CollectionMap[C]>[],
  ): Promise<void>;
  pull(
    sb: TypedSupabaseClient,
    userId: string,
    since: string | null,
    page: number,
  ): Promise<RemoteRow<CollectionMap[C]>[]>;
}

export type Adapters<C extends CollectionName> = { [K in C]: Adapter<K> };

export const num = (v: unknown): number => (v == null ? 0 : Number(v));
export const optNum = (v: unknown): number | undefined => (v == null ? undefined : Number(v));
export const nullableNum = (v: unknown): number | null => (v == null ? null : Number(v));

export function check<T>(res: {
  data: T | null;
  error: { message: string } | null;
}): NonNullable<T> | [] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

export const json = (v: unknown) => v as NonNullable<Json>;

export function nutrientColumns(n: Nutrients) {
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

export function nutrientsFrom(row: Record<string, unknown>): Nutrients {
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

/** Rows per pull request (the API returns at most 1000; the engine asks for pages until short). */
export const PULL_PAGE = 500;

/** Rows changed after `since`, in a stable order, one page at a time. */
export const sinceFilter = <
  Q extends {
    gt: (c: string, v: string) => Q;
    order: (c: string) => Q;
    range: (from: number, to: number) => Q;
  },
>(
  q: Q,
  since: string | null,
  page: number,
) =>
  (since ? q.gt('updated_at', since) : q)
    .order('updated_at')
    .order('id')
    .range(page * PULL_PAGE, (page + 1) * PULL_PAGE - 1);

type TableName = keyof Database['public']['Tables'];
type UpsertClient = {
  from(table: string): {
    upsert(
      rows: object[],
      options?: { onConflict?: string },
    ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
};

/**
 * A bulk upsert sends the union of the rows' keys and writes NULL where a row lacks one: rows are
 * grouped by their exact set of keys so each request behaves like single-row upserts.
 */
export function groupByKeys<T extends object>(rows: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = Object.keys(row)
      .filter((k) => (row as Record<string, unknown>)[k] !== undefined)
      .sort()
      .join(',');
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()];
}

/** Push for tables written with a plain upsert: one request per batch (per key shape). */
export function upsertRows<T extends TableName, R>(
  table: T,
  toRow: (userId: string, record: R, deletedAt: string | null) => TablesInsert<T>,
  onConflict?: string,
) {
  return async (sb: TypedSupabaseClient, userId: string, items: readonly PushItem<R>[]) => {
    const rows = items.map((i) => toRow(userId, i.record, i.deletedAt));
    // The typed client can't follow a generic table name; rows are typed by `toRow` above.
    const client = sb as unknown as UpsertClient;
    for (const group of groupByKeys(rows))
      check(await client.from(table).upsert(group, onConflict ? { onConflict } : undefined));
  };
}
