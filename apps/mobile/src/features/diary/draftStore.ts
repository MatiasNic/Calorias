import type { IsoDate, MealItem, MealSource, MealType } from '@plato/shared';
import { create } from 'zustand';

import { withGrams } from './mealMath';

/** Editable meal draft shared by the scan review screen and the meal editor. */
export interface MealDraft {
  mealId: string | null;
  date: IsoDate;
  time: { h: number; m: number };
  mealType: MealType;
  source: MealSource;
  items: MealItem[];
  photoPath: string | null;
  localPhotoUri: string | null;
  aiScanId: string | null;
  dishName: string | null;
  hiddenQuestion: string | null;
  notes: string | null;
  /** Original AI result, kept for "Reportar error" feedback. */
  original: MealItem[] | null;
}

interface DraftState {
  draft: MealDraft | null;
  start: (d: MealDraft) => void;
  patch: (p: Partial<MealDraft>) => void;
  setItems: (items: MealItem[]) => void;
  updateItem: (index: number, item: MealItem) => void;
  setGrams: (index: number, grams: number) => void;
  removeItem: (index: number) => void;
  addItem: (item: MealItem) => void;
  replaceItem: (index: number, item: MealItem) => void;
  clear: () => void;
}

export const useDraftStore = create<DraftState>((set) => ({
  draft: null,
  start: (draft) => set({ draft }),
  patch: (p) => set((s) => (s.draft ? { draft: { ...s.draft, ...p } } : s)),
  setItems: (items) => set((s) => (s.draft ? { draft: { ...s.draft, items } } : s)),
  updateItem: (index, item) =>
    set((s) =>
      s.draft
        ? { draft: { ...s.draft, items: s.draft.items.map((x, i) => (i === index ? item : x)) } }
        : s,
    ),
  setGrams: (index, grams) =>
    set((s) =>
      s.draft
        ? {
            draft: {
              ...s.draft,
              items: s.draft.items.map((x, i) => (i === index ? withGrams(x, grams) : x)),
            },
          }
        : s,
    ),
  removeItem: (index) =>
    set((s) =>
      s.draft ? { draft: { ...s.draft, items: s.draft.items.filter((_, i) => i !== index) } } : s,
    ),
  addItem: (item) =>
    set((s) => (s.draft ? { draft: { ...s.draft, items: [...s.draft.items, item] } } : s)),
  replaceItem: (index, item) =>
    set((s) =>
      s.draft
        ? { draft: { ...s.draft, items: s.draft.items.map((x, i) => (i === index ? item : x)) } }
        : s,
    ),
  clear: () => set({ draft: null }),
}));
