import { create } from 'zustand';

import type { RecipeItem } from '@/services/db/types';

interface RecipeDraftState {
  id: string | null;
  name: string;
  servings: number;
  items: RecipeItem[];
  set: (
    p: Partial<Omit<RecipeDraftState, 'set' | 'addItem' | 'updateItem' | 'removeItem' | 'reset'>>,
  ) => void;
  addItem: (i: RecipeItem) => void;
  updateItem: (index: number, patch: Partial<RecipeItem>) => void;
  removeItem: (index: number) => void;
  reset: () => void;
}

export const useRecipeDraftStore = create<RecipeDraftState>((set) => ({
  id: null,
  name: '',
  servings: 1,
  items: [],
  set: (p) => set(p),
  addItem: (i) => set((s) => ({ items: [...s.items, i] })),
  updateItem: (index, patch) =>
    set((s) => ({ items: s.items.map((it, j) => (j === index ? { ...it, ...patch } : it)) })),
  removeItem: (index) => set((s) => ({ items: s.items.filter((_, j) => j !== index) })),
  reset: () => set({ id: null, name: '', servings: 1, items: [] }),
}));
