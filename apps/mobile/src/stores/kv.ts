import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** Synchronous SQLite-backed storage for small preferences (no flash of default theme). */
const syncStorage: StateStorage = {
  getItem: (key) => {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // ignore: preferences are best-effort
    }
  },
  removeItem: (key) => {
    try {
      Storage.removeItemSync(key);
    } catch {
      // ignore
    }
  },
};

export const kvJSONStorage = createJSONStorage(() => syncStorage);
export { Storage as kvStorage };

const memoryFallback = new Map<string, string>();

/** Small synchronous KV helpers that never throw (fall back to memory if storage fails). */
export const kv = {
  get(key: string): string | null {
    try {
      return Storage.getItemSync(key) ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    memoryFallback.set(key, value);
    try {
      Storage.setItemSync(key, value);
    } catch {
      // keep in memory only
    }
  },
};
