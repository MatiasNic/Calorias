import type { IsoDate } from '@plato/shared';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { todayLocal } from '@/utils/dates';

interface UiState {
  /** Date shown on Today/Diary. */
  selectedDate: IsoDate;
  /** The local "today" when selectedDate was last reconciled (detects midnight rollovers). */
  knownToday: IsoDate;
  setSelectedDate: (d: IsoDate) => void;
  /** Moves selectedDate forward if the day changed while it pointed at "today". */
  rollOverIfNewDay: () => boolean;
}

export const useUiStore = create<UiState>((set, get) => ({
  selectedDate: todayLocal(),
  knownToday: todayLocal(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  rollOverIfNewDay: () => {
    const today = todayLocal();
    const { knownToday, selectedDate } = get();
    if (today === knownToday) return false;
    set({ knownToday: today, selectedDate: selectedDate === knownToday ? today : selectedDate });
    return true;
  },
}));

const MINUTE = 60_000;
const check = () => useUiStore.getState().rollOverIfNewDay();
AppState.addEventListener('change', (s) => {
  if (s === 'active') check();
});
// unref: don't keep test runners alive (no-op on React Native).
(setInterval(check, MINUTE) as unknown as { unref?: () => void }).unref?.();
