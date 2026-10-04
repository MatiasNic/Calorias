/* eslint-disable @typescript-eslint/no-require-imports */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-sqlite/kv-store', () => {
  const mem = new Map<string, string>();
  const storage = {
    getItemSync: (k: string) => mem.get(k) ?? null,
    setItemSync: (k: string, v: string) => void mem.set(k, v),
    removeItemSync: (k: string) => void mem.delete(k),
    getItem: async (k: string) => mem.get(k) ?? null,
    setItem: async (k: string, v: string) => void mem.set(k, v),
    removeItem: async (k: string) => void mem.delete(k),
  };
  return { __esModule: true, default: storage, Storage: storage };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', languageTag: 'es-AR' }],
  getCalendars: () => [{ timeZone: 'America/Argentina/Buenos_Aires' }],
}));

// Initialise i18n once for all component tests (Spanish by default).
// eslint-disable-next-line import/first
import { initI18n } from './src/i18n';
initI18n('es-AR');

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomValues: (a: Uint8Array) => require('crypto').getRandomValues(a),
  digestStringAsync: jest.fn(async () => 'hash'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    throw new Error('expo-sqlite is not available in unit tests');
  },
}));
