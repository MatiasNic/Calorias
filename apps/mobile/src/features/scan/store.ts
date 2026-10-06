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
  /** What the user typed or dictated (to edit it if the AI didn't recognise food). */
  inputText: string | null;
  setPhoto: (p: CapturedPhoto, mealType?: MealType | null, date?: IsoDate | null) => void;
  setTextResult: (
    r: AnalyzeResponse,
    source: 'text' | 'voice',
    date?: IsoDate | null,
    inputText?: string | null,
  ) => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  photo: null,
  result: null,
  source: 'photo',
  mealType: null,
  date: null,
  inputText: null,
  setPhoto: (photo, mealType = null, date = null) =>
    set({ photo, result: null, source: 'photo', mealType, date, inputText: null }),
  setTextResult: (result, source, date = null, inputText = null) =>
    set({ result, source, photo: null, date, inputText }),
  clear: () =>
    set({
      photo: null,
      result: null,
      source: 'photo',
      mealType: null,
      date: null,
      inputText: null,
    }),
}));
