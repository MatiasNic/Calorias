import type { ActivityLevel, DietaryPreference, GoalType, Sex } from '@plato/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvJSONStorage } from '@/stores/kv';

export type StepId =
  | 'goal'
  | 'sex'
  | 'birth'
  | 'height'
  | 'weight'
  | 'target'
  | 'activity'
  | 'rate'
  | 'diet'
  | 'result'
  | 'permissions'
  | 'paywall';

export interface OnboardingAnswers {
  goal: GoalType | null;
  sex: Sex | null;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  activity: ActivityLevel | null;
  weeklyRateKg: number | null;
  dietaryPreferences: DietaryPreference[];
  allergies: string[];
}

interface OnboardingState {
  answers: OnboardingAnswers;
  stepIndex: number;
  set: (patch: Partial<OnboardingAnswers>) => void;
  goTo: (index: number) => void;
  reset: () => void;
}

const initial: OnboardingAnswers = {
  goal: null,
  sex: null,
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  activity: null,
  weeklyRateKg: null,
  dietaryPreferences: [],
  allergies: [],
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      answers: initial,
      stepIndex: 0,
      set: (patch) => set((s) => ({ answers: { ...s.answers, ...patch } })),
      goTo: (stepIndex) => set({ stepIndex }),
      reset: () => set({ answers: initial, stepIndex: 0 }),
    }),
    { name: 'plato.onboarding', storage: kvJSONStorage },
  ),
);

export function stepsFor(goal: GoalType | null): StepId[] {
  const needsTarget = goal === 'lose' || goal === 'gain' || goal === 'build_muscle';
  return [
    'goal',
    'sex',
    'birth',
    'height',
    'weight',
    ...(needsTarget ? (['target'] as const) : []),
    'activity',
    ...(needsTarget ? (['rate'] as const) : []),
    'diet',
    'result',
    'permissions',
    'paywall',
  ];
}

export function birthDateIso(a: OnboardingAnswers): string | null {
  const y = Number(a.birthYear);
  const m = Number(a.birthMonth);
  const d = Number(a.birthDay);
  if (!y || !m || !d || m > 12 || d > 31 || y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
