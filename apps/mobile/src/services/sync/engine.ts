import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { getDb } from '@/services/db/database';
import { collection, dbEvents } from '@/services/db/repository';
import type { CollectionName } from '@/services/db/types';
import { getSupabase } from '@/services/supabase/client';
import { useSessionStore } from '@/stores/session';
import { adapters, SYNC_ORDER } from './adapters';

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

/** Pushes dirty local records, then pulls remote changes. Safe to call often. */
export function syncNow(): Promise<void> {
  if (running) return running;
  running = doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync() {
  const session = useSessionStore.getState();
  const sb = getSupabase();
  if (!sb || session.status !== 'authenticated' || !session.userId) return;
  if (!useSyncStatus.getState().online) return;

  const userId = session.userId;
  useSyncStatus.setState({ syncing: true, lastError: null });
  const errors: string[] = [];

  for (const name of SYNC_ORDER) {
    const repo = collection(name);
    const adapter = adapters[name];
    try {
      for (const item of await repo.dirty()) {
        await (
          adapter.push as (s: typeof sb, u: string, r: unknown, d: string | null) => Promise<void>
        )(sb, userId, item.record, item.deletedAt);
        await repo.markClean(item.record.id, item.updatedAt);
      }
      const last = await getLastPulled(name);
      const since = last
        ? new Date(new Date(last).getTime() - PULL_OVERLAP_MS).toISOString()
        : null;
      const rows = await adapter.pull(sb, userId, since);
      let maxTs = last;
      for (const row of rows) {
        await (repo.applyRemote as (r: unknown, d: string | null, u: string) => Promise<void>)(
          row.record,
          row.deletedAt,
          row.updatedAt,
        );
        if (!maxTs || row.updatedAt > maxTs) maxTs = row.updatedAt;
      }
      if (maxTs) await setLastPulled(name, maxTs);
      if (rows.length) dbEvents.emit(name, 'remote');
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

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
