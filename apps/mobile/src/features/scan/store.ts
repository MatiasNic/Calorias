import type { AnalyzeResponse, MealType } from '@plato/shared';
import { create } from 'zustand';

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

interface ScanState {
  photo: CapturedPhoto | null;
  /** Pre-computed result (text/voice flow skips the photo analysis). */
  result: AnalyzeResponse | null;
  source: 'photo' | 'text' | 'voice';
  mealType: MealType | null;
  setPhoto: (p: CapturedPhoto, mealType?: MealType | null) => void;
  setTextResult: (r: AnalyzeResponse, source: 'text' | 'voice') => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  photo: null,
  result: null,
  source: 'photo',
  mealType: null,
  setPhoto: (photo, mealType = null) => set({ photo, result: null, source: 'photo', mealType }),
  setTextResult: (result, source) => set({ result, source, photo: null }),
  clear: () => set({ photo: null, result: null, source: 'photo', mealType: null }),
}));
