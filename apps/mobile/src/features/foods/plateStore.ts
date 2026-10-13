import type { IsoDate, MealItem, MealType } from '@bocado/shared';
import { create } from 'zustand';

/**
 * The plate being built in the food search: several foods picked one by one, reviewed together
 * and saved as one meal (each portion is adjusted in the meal editor).
 */
interface PlateState {
  items: MealItem[];
  date: IsoDate | null;
  mealType: MealType | null;
  add: (item: MealItem, date: IsoDate, mealType: MealType) => void;
  remove: (index: number) => void;
  clear: () => void;
}

export const usePlateStore = create<PlateState>((set) => ({
  items: [],
  date: null,
  mealType: null,
  add: (item, date, mealType) => set((s) => ({ items: [...s.items, item], date, mealType })),
  remove: (index) => set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
  clear: () => set({ items: [], date: null, mealType: null }),
}));
