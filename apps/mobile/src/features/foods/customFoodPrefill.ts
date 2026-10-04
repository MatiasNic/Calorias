import type { Nutrients } from '@plato/shared';
import { create } from 'zustand';

export interface CustomFoodPrefill {
  name?: string;
  brand?: string | null;
  barcode?: string | null;
  servingGrams?: number | null;
  per100g?: Nutrients | null;
  origin?: 'manual' | 'label' | 'off' | 'ai';
}

/** Lets the label scanner / barcode flow open the custom-food form pre-filled. */
export const useCustomFoodPrefill = create<{
  prefill: CustomFoodPrefill | null;
  set: (p: CustomFoodPrefill | null) => void;
}>((set) => ({
  prefill: null,
  set: (prefill) => set({ prefill }),
}));
