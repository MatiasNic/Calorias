/* eslint-disable @typescript-eslint/no-require-imports */
import type * as EngineModule from '@/services/sync/engine';

// Sync engine with in-memory fakes for the local DB, the repositories and the server adapters.

type Row = { record: { id: string }; updatedAt: string; deletedAt: string | null };

const mockState = {
  cursor: new Map<string, string>(),
  dirty: new Map<string, Row[]>(),
  applied: [] as string[],
  cleaned: [] as string[],
  server: new Map<string, Row[]>(),
  pushFails: new Set<string>(),
  pullCalls: [] as { name: string; since: string | null; page: number }[],
  emitted: [] as string[],
};

jest.mock('@/services/db/database', () => ({
  getDb: async () => ({
    getFirstAsync: async (_sql: string, [c]: [string]) => {
      const v = mockState.cursor.get(c);
      return v ? { last_pulled_at: v } : null;
    },
    runAsync: async (_sql: string, [c, ts]: [string, string]) => void mockState.cursor.set(c, ts),
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
  }),
}));

jest.mock('@/services/db/repository', () => ({
  collection: (name: string) => ({
    dirty: async () => mockState.dirty.get(name) ?? [],
    markClean: async (id: string) => void mockState.cleaned.push(`${name}:${id}`),
    applyRemote: async (r: { id: string }) => {
      mockState.applied.push(`${name}:${r.id}`);
      return true;
    },
  }),
  dbEvents: {
    emit: (name: string) => void mockState.emitted.push(name),
    subscribe: () => () => {},
  },
}));

jest.mock('@/services/sync/adapters', () => {
  const PULL_PAGE = 2;
  const adapter = (name: string) => ({
    push: async (_sb: unknown, _u: string, r: { id: string }) => {
      if (mockState.pushFails.has(r.id)) throw new Error(`bad ${r.id}`);
    },
    pull: async (_sb: unknown, _u: string, since: string | null, page: number) => {
      mockState.pullCalls.push({ name, since, page });
      return (mockState.server.get(name) ?? []).slice(page * PULL_PAGE, (page + 1) * PULL_PAGE);
    },
  });
  return {
    PULL_PAGE,
    SYNC_ORDER: ['meals', 'water'],
    adapters: { meals: adapter('meals'), water: adapter('water') },
  };
});

jest.mock('@/services/supabase/client', () => ({ getSupabase: () => ({}) }));
jest.mock('@/services/analytics', () => ({ captureError: jest.fn() }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: () => () => {} }));

const row = (id: string, updatedAt: string): Row => ({
  record: { id },
  updatedAt,
  deletedAt: null,
});

beforeEach(() => {
  jest.resetModules();
  mockState.cursor.clear();
  mockState.dirty.clear();
  mockState.server.clear();
  mockState.pushFails.clear();
  mockState.applied = [];
  mockState.cleaned = [];
  mockState.pullCalls = [];
  mockState.emitted = [];
  const { useSessionStore } = require('@/stores/session');
  useSessionStore.setState({ status: 'authenticated', userId: 'u1' });
});

type Engine = typeof EngineModule;
const engine = () => require('@/services/sync/engine') as Engine;

describe('sync engine', () => {
  it('pulls every page of a large history before moving the cursor', async () => {
    mockState.server.set('meals', [
      row('a', '2026-10-01T00:00:00Z'),
      row('b', '2026-10-02T00:00:00Z'),
      row('c', '2026-10-03T00:00:00Z'),
      row('d', '2026-10-04T00:00:00Z'),
      row('e', '2026-10-05T00:00:00Z'),
    ]);
    await engine().syncNow();
    expect(mockState.applied.filter((a) => a.startsWith('meals'))).toHaveLength(5);
    expect(mockState.pullCalls.filter((c) => c.name === 'meals').map((c) => c.page)).toEqual([
      0, 1, 2,
    ]);
    expect(mockState.cursor.get('meals')).toBe('2026-10-05T00:00:00Z');
    expect(mockState.emitted).toEqual(['meals']);
  });

  it('a record the server rejects does not block the rest or the pull', async () => {
    mockState.dirty.set('meals', [row('bad', 't1'), row('ok', 't2')]);
    mockState.pushFails.add('bad');
    mockState.server.set('meals', [row('x', '2026-10-01T00:00:00Z')]);
    await engine().syncNow();
    expect(mockState.cleaned).toEqual(['meals:ok']);
    expect(mockState.applied).toContain('meals:x');
    const { useSyncStatus } = engine();
    expect(useSyncStatus.getState().lastError).toContain('bad');
  });

  it('pulls with an overlap before the last cursor', async () => {
    mockState.cursor.set('water', '2026-10-05T00:01:00.000Z');
    await engine().syncNow();
    const call = mockState.pullCalls.find((c) => c.name === 'water');
    expect(call?.since).toBe('2026-10-05T00:00:00.000Z');
  });

  it('runs once more when asked to sync while a sync is running', async () => {
    const { syncNow } = engine();
    const first = syncNow();
    void syncNow();
    await first;
    expect(mockState.pullCalls.filter((c) => c.name === 'water' && c.page === 0)).toHaveLength(2);
  });
});
