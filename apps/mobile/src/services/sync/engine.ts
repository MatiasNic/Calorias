import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { captureError } from '@/services/analytics';
import { getDb } from '@/services/db/database';
import { collection, dbEvents } from '@/services/db/repository';
import type { CollectionName } from '@/services/db/types';
import { getSupabase } from '@/services/supabase/client';
import { useSessionStore } from '@/stores/session';
import { adapters, PULL_PAGE, SYNC_ORDER } from './adapters';
import { isValidPulledRecord } from './schemas';

/** Overlap when pulling, to tolerate transactions that committed slightly out of order. */
const PULL_OVERLAP_MS = 60_000;
const DEBOUNCE_MS = 1500;

interface SyncStatus {
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  online: boolean;
}

export const useSyncStatus = create<SyncStatus>(() => ({
  syncing: false,
  lastSyncedAt: null,
  lastError: null,
  online: true,
}));

async function getLastPulled(c: CollectionName): Promise<string | null> {
  const row = await (
    await getDb()
  ).getFirstAsync<{ last_pulled_at: string | null }>(
    'SELECT last_pulled_at FROM sync_state WHERE collection = ?',
    [c],
  );
  return row?.last_pulled_at ?? null;
}

async function setLastPulled(c: CollectionName, ts: string) {
  await (
    await getDb()
  ).runAsync(
    'INSERT INTO sync_state (collection, last_pulled_at) VALUES (?, ?) ON CONFLICT (collection) DO UPDATE SET last_pulled_at = excluded.last_pulled_at',
    [c, ts],
  );
}

let running: Promise<void> | null = null;
let rerun = false;
let lastReported = '';

/**
 * Pushes dirty local records, then pulls remote changes. Safe to call often: a call made while a
 * sync is running schedules one more pass, so writes made meanwhile aren't left waiting.
 */
export function syncNow(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    do {
      rerun = false;
      await doSync();
    } while (rerun);
  })().finally(() => {
    running = null;
  });
  return running;
}

type AnyRepo = {
  dirty(): Promise<{ record: { id: string }; updatedAt: string; deletedAt: string | null }[]>;
  markClean(id: string, updatedAt: string): Promise<void>;
  applyRemote(record: unknown, deletedAt: string | null, updatedAt: string): Promise<boolean>;
};
type AnyAdapter = {
  push(
    sb: unknown,
    userId: string,
    items: { record: unknown; deletedAt: string | null }[],
  ): Promise<void>;
  pull(
    sb: unknown,
    userId: string,
    since: string | null,
    page: number,
  ): Promise<{ record: unknown; updatedAt: string; deletedAt: string | null }[]>;
};

/** Records per upload request. */
export const PUSH_BATCH = 100;

/**
 * Uploads every dirty record, a batch per request. A batch the server rejects is retried one
 * record at a time, so one bad record doesn't block the others.
 */
async function pushCollection(sb: unknown, userId: string, repo: AnyRepo, adapter: AnyAdapter) {
  const errors: string[] = [];
  const dirty = await repo.dirty();
  const send = async (items: typeof dirty) => {
    await adapter.push(
      sb,
      userId,
      items.map((i) => ({ record: i.record, deletedAt: i.deletedAt })),
    );
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const i of items) await repo.markClean(i.record.id, i.updatedAt);
    });
  };
  for (let i = 0; i < dirty.length; i += PUSH_BATCH) {
    const batch = dirty.slice(i, i + PUSH_BATCH);
    try {
      await send(batch);
    } catch (e) {
      if (batch.length === 1) {
        errors.push(e instanceof Error ? e.message : String(e));
        continue;
      }
      for (const item of batch) {
        try {
          await send([item]);
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    }
  }
  return errors;
}

/** Pulls every page changed since the last pull. Returns whether any local row changed. */
async function pullCollection(
  name: CollectionName,
  sb: unknown,
  userId: string,
  repo: AnyRepo,
  adapter: AnyAdapter,
) {
  const last = await getLastPulled(name);
  const since = last ? new Date(new Date(last).getTime() - PULL_OVERLAP_MS).toISOString() : null;
  const db = await getDb();
  let maxTs = last;
  let changed = false;
  const invalid: string[] = [];
  for (let page = 0; ; page++) {
    const rows = await adapter.pull(sb, userId, since, page);
    // One transaction per page: a single commit instead of one per row.
    await db.withTransactionAsync(async () => {
      for (const row of rows) {
        if (!maxTs || row.updatedAt > maxTs) maxTs = row.updatedAt;
        // A malformed row is skipped (and reported) instead of breaking the screens that read it.
        if (!row.deletedAt && !isValidPulledRecord(name, row.record)) {
          invalid.push(String((row.record as { id?: unknown })?.id ?? '?'));
          continue;
        }
        if (await repo.applyRemote(row.record, row.deletedAt, row.updatedAt)) changed = true;
      }
    });
    if (rows.length < PULL_PAGE) break;
  }
  // The cursor only moves once every page is stored, so an interrupted pull is retried whole.
  if (maxTs && maxTs !== last) await setLastPulled(name, maxTs);
  if (invalid.length)
    captureError(new Error('sync: invalid rows skipped'), {
      collection: name,
      ids: invalid.slice(0, 20),
    });
  return changed;
}

async function doSync() {
  const session = useSessionStore.getState();
  const sb = getSupabase();
  if (!sb || session.status !== 'authenticated' || !session.userId) return;
  if (!useSyncStatus.getState().online) return;

  const userId = session.userId;
  useSyncStatus.setState({ syncing: true, lastError: null });
  const errors: string[] = [];
  const changed: CollectionName[] = [];

  for (const name of SYNC_ORDER) {
    const repo = collection(name) as unknown as AnyRepo;
    const adapter = adapters[name] as unknown as AnyAdapter;
    try {
      for (const e of await pushCollection(sb, userId, repo, adapter))
        errors.push(`${name} push: ${e}`);
      if (await pullCollection(name, sb, userId, repo, adapter)) changed.push(name);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Screens refresh once per changed collection, and only when something really changed.
  for (const name of changed) dbEvents.emit(name, 'remote');
  // Reported once per distinct failure, not on every foreground while it lasts.
  const report = errors.slice(0, 10).join('\n');
  if (report && report !== lastReported) captureError(new Error('sync failed'), { errors: report });
  lastReported = report;

  useSyncStatus.setState({
    syncing: false,
    lastSyncedAt: errors.length ? useSyncStatus.getState().lastSyncedAt : new Date().toISOString(),
    lastError: errors.length ? errors.join('\n') : null,
  });
}

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow().catch(() => undefined);
  }, DEBOUNCE_MS);
}

/** Wires automatic sync: after local writes, on reconnect and when the app comes to foreground. */
export function startSyncEngine(): () => void {
  // Only local writes need an upload; reacting to pulled rows re-synced forever (the pull
  // overlap always returns the latest rows again).
  const unsubDb = dbEvents.subscribe((_, origin) => {
    if (origin === 'local') scheduleSync();
  });
  const unsubNet = NetInfo.addEventListener((state) => {
    const online = !!state.isConnected && state.isInternetReachable !== false;
    const wasOnline = useSyncStatus.getState().online;
    useSyncStatus.setState({ online });
    if (online && !wasOnline) scheduleSync();
  });
  const appSub = AppState.addEventListener('change', (s) => {
    if (s === 'active') scheduleSync();
  });
  scheduleSync();
  return () => {
    unsubDb();
    unsubNet();
    appSub.remove();
  };
}
