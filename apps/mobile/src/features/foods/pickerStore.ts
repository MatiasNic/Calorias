import type { IsoDate, MealType } from '@bocado/shared';
import { create } from 'zustand';

import type { FoodOption } from './search';

/** Where a picked food goes: a new diary entry, the open draft (scan review / meal editor) or a recipe. */
export type PickTarget =
  | {
      kind: 'diary';
      date: IsoDate;
      mealType: MealType;
      /** From the food search: picked foods go to the plate (several per meal). */
      plate?: boolean;
    }
  | { kind: 'draft' }
  | { kind: 'recipe' };

interface PickerState {
  target: PickTarget | null;
  food: FoodOption | null;
  /** When replacing an item in the draft ("cambiar alimento"). */
  replaceIndex: number | null;
  open: (target: PickTarget, replaceIndex?: number | null) => void;
  select: (food: FoodOption) => void;
  /** Done with the picked food, keep the target (to pick the next one). */
  drop: () => void;
  clear: () => void;
}

export const usePickerStore = create<PickerState>((set) => ({
  target: null,
  food: null,
  replaceIndex: null,
  open: (target, replaceIndex = null) => set({ target, replaceIndex, food: null }),
  select: (food) => set({ food }),
  drop: () => set({ food: null }),
  clear: () => set({ target: null, food: null, replaceIndex: null }),
}));
