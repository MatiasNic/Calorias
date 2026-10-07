import type { AppLocale, UnitSystem } from '@plato/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvJSONStorage } from './kv';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface PrefsState {
  theme: ThemePreference;
  locale: AppLocale | null;
  units: UnitSystem;
  analyticsConsent: boolean | null;
  crashReportingConsent: boolean | null;
  savePhotos: boolean;
  hapticsEnabled: boolean;
  seenScanTips: boolean;
  /** Adds exercise calories to the day's budget ("kcal disponibles"). */
  exerciseInBudget: boolean;
  set: (patch: Partial<Omit<PrefsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = {
  theme: 'system' as ThemePreference,
  locale: null,
  units: 'metric' as UnitSystem,
  analyticsConsent: null,
  crashReportingConsent: null,
  savePhotos: true,
  hapticsEnabled: true,
  seenScanTips: false,
  exerciseInBudget: true,
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: 'plato.prefs', storage: kvJSONStorage, version: 1 },
  ),
);
