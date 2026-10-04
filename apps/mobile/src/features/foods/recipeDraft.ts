import { create } from 'zustand';

import type { RecipeItem } from '@/services/db/types';

interface RecipeDraftState {
  id: string | null;
  name: string;
  servings: number;
  items: RecipeItem[];
  set: (p: Partial<Omit<RecipeDraftState, 'set' | 'addItem' | 'removeItem' | 'reset'>>) => void;
  addItem: (i: RecipeItem) => void;
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
  removeItem: (index) => set((s) => ({ items: s.items.filter((_, j) => j !== index) })),
  reset: () => set({ id: null, name: '', servings: 1, items: [] }),
}));
