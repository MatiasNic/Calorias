import type { IsoDate } from '@plato/shared';
import { create } from 'zustand';

import { todayLocal } from '@/utils/dates';

interface UiState {
  /** Date shown on Today/Diary. */
  selectedDate: IsoDate;
  setSelectedDate: (d: IsoDate) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedDate: todayLocal(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
}));
