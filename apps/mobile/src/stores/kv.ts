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
