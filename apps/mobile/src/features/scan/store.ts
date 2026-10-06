import type { AnalyzeResponse, IsoDate, MealType } from '@plato/shared';
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
  /** Day the meal belongs to (null = today). */
  date: IsoDate | null;
  setPhoto: (p: CapturedPhoto, mealType?: MealType | null) => void;
  setTextResult: (r: AnalyzeResponse, source: 'text' | 'voice', date?: IsoDate | null) => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  photo: null,
  result: null,
  source: 'photo',
  mealType: null,
  date: null,
  setPhoto: (photo, mealType = null) =>
    set({ photo, result: null, source: 'photo', mealType, date: null }),
  setTextResult: (result, source, date = null) => set({ result, source, photo: null, date }),
  clear: () => set({ photo: null, result: null, source: 'photo', mealType: null, date: null }),
}));
