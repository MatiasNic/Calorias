import type { AppLocale, UnitSystem } from '@plato/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvJSONStorage } from './kv';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface TrainingReminder {
  enabled: boolean;
  /** 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** "HH:mm". */
  time: string;
}

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
  /** Workout reminder (device-local, like the notification schedule itself). */
  trainingReminder: TrainingReminder;
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
  trainingReminder: { enabled: false, days: [1, 3, 5], time: '18:00' } as TrainingReminder,
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
