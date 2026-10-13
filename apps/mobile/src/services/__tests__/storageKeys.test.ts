import { migrateLegacyKeys, STORAGE_KEYS } from '@/stores/storageKeys';

function memory(initial: Record<string, string>) {
  const m = new Map(Object.entries(initial));
  return {
    map: m,
    getItemSync: (k: string) => m.get(k) ?? null,
    setItemSync: (k: string, v: string) => void m.set(k, v),
    removeItemSync: (k: string) => void m.delete(k),
  };
}

describe('migrateLegacyKeys', () => {
  it('moves values from the old "plato." keys', () => {
    const s = memory({ 'plato.session': '{"a":1}', 'plato.prefs': '{"theme":"dark"}' });
    expect(migrateLegacyKeys(s)).toBe(2);
    expect(s.map.get(STORAGE_KEYS.session)).toBe('{"a":1}');
    expect(s.map.get(STORAGE_KEYS.prefs)).toBe('{"theme":"dark"}');
    expect(s.map.has('plato.session')).toBe(false);
  });

  it('keeps a value already saved under the new key', () => {
    const s = memory({ 'plato.plan': 'old', [STORAGE_KEYS.plan]: 'new' });
    expect(migrateLegacyKeys(s)).toBe(0);
    expect(s.map.get(STORAGE_KEYS.plan)).toBe('new');
    expect(s.map.has('plato.plan')).toBe(false);
  });

  it('does nothing on a fresh install or the second time', () => {
    const s = memory({});
    expect(migrateLegacyKeys(s)).toBe(0);
    expect(migrateLegacyKeys(s)).toBe(0);
  });
});
