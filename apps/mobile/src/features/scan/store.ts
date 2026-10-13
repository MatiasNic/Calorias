import type { AnalyzeResponse, IsoDate, MealType } from '@bocado/shared';
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
  /** What the user says about the photo before taking it ("es de pollo, sin aceite"). */
  hint: string | null;
  setHint: (hint: string | null) => void;
  setPhoto: (p: CapturedPhoto, mealType?: MealType | null, date?: IsoDate | null) => void;
  setTextResult: (
    r: AnalyzeResponse,
    source: 'text' | 'voice',
    date?: IsoDate | null,
    inputText?: string | null,
    mealType?: MealType | null,
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
  hint: null,
  setHint: (hint) => set({ hint }),
  setPhoto: (photo, mealType = null, date = null) =>
    set({ photo, result: null, source: 'photo', mealType, date, inputText: null }),
  setTextResult: (result, source, date = null, inputText = null, mealType = null) =>
    set({ result, source, photo: null, date, inputText, mealType }),
  clear: () =>
    set({
      photo: null,
      result: null,
      source: 'photo',
      mealType: null,
      date: null,
      inputText: null,
      hint: null,
    }),
}));
