/** Every key the app keeps in the device key-value store (one place, one naming scheme). */
export const STORAGE_KEYS = {
  session: 'bocado.session',
  prefs: 'bocado.prefs',
  plan: 'bocado.plan',
  onboarding: 'bocado.onboarding',
  termsAcceptedAt: 'bocado.termsAcceptedAt',
  mockQuota: 'bocado.mockQuota',
  mockTrials: 'bocado.mockTrials',
  mealPlan: 'bocado.mealPlan',
  mealPlanPrefs: 'bocado.mealPlanPrefs',
} as const;

/** Keys of the account's own data, removed on sign-out and account deletion. */
export const USER_DATA_KEYS = [
  STORAGE_KEYS.mockQuota,
  STORAGE_KEYS.mockTrials,
  STORAGE_KEYS.mealPlan,
  STORAGE_KEYS.mealPlanPrefs,
] as const;

/** The app was called "Plato" during development: its keys used this prefix. */
const LEGACY_PREFIX = 'plato.';
const legacyKey = (key: string) => LEGACY_PREFIX + key.slice(key.indexOf('.') + 1);

interface SyncKV {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): void;
}

/**
 * Moves values stored under the old "plato." keys to the current ones (once; a value already
 * stored under the new key wins). Runs before any store reads its persisted state, so nobody
 * loses their session, preferences or onboarding when updating.
 */
export function migrateLegacyKeys(storage: SyncKV): number {
  let moved = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const old = legacyKey(key);
    const value = storage.getItemSync(old);
    if (value == null) continue;
    if (storage.getItemSync(key) == null) {
      storage.setItemSync(key, value);
      moved += 1;
    }
    storage.removeItemSync(old);
  }
  return moved;
}

export const LEGACY_SECURE_PREFIX = `${LEGACY_PREFIX}enc.`;
