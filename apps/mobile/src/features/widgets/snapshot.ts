import type { MealType } from '@bocado/shared';

import { kvStorage } from '@/stores/kv';

/**
 * What the home-screen widgets show. The app writes it whenever today's numbers change; the
 * widget task (which runs without the app open) reads it and updates it after a widget action,
 * so widgets always answer instantly, even offline and with the app closed.
 */
export interface WidgetUsualMeal {
  /** Meal record to repeat. */
  recordId: string;
  mealType: MealType;
  mealLabel: string;
  names: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WidgetSnapshot {
  /** Day the numbers belong to ("YYYY-MM-DD"); another day means "nothing logged yet". */
  date: string;
  targetKcal: number;
  consumedKcal: number;
  protein: { value: number; target: number };
  carbs: { value: number; target: number };
  fat: { value: number; target: number };
  waterMl: number;
  waterTargetMl: number;
  usual: WidgetUsualMeal[];
  /** Usual meals logged from the widget today (shown with a check). */
  loggedUsual: string[];
  /** Texts in the user's language (the widget task has no i18n). */
  labels: WidgetLabels;
}

export interface WidgetLabels {
  left: string;
  over: string;
  consumed: string;
  goal: string;
  talk: string;
  whatAte: string;
  photo: string;
  write: string;
  water: string;
  usual: string;
  usualEmpty: string;
  logged: string;
  undo: string;
}

export const DEFAULT_LABELS: WidgetLabels = {
  left: 'Te quedan',
  over: 'Por encima del objetivo',
  consumed: 'consumidas',
  goal: 'Objetivo',
  talk: 'Hablar',
  whatAte: '¿Qué comiste?',
  photo: 'Foto',
  write: 'Escribir',
  water: 'Agua',
  usual: 'Lo de siempre',
  usualEmpty: 'Registrá comidas y las que repitas aparecen acá.',
  logged: 'Registrado',
  undo: 'Deshacer',
};

const KEY = 'bocado.widget';
const QUEUE_KEY = 'bocado.widget.queue';

function read<T>(key: string): T | null {
  try {
    const raw = kvStorage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // unreadable or corrupt value: the widgets start from an empty day
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    kvStorage.setItemSync(key, JSON.stringify(value));
  } catch {
    // widgets are best-effort
  }
}

export const readSnapshot = () => read<WidgetSnapshot>(KEY);
export const writeSnapshot = (s: WidgetSnapshot) => write(KEY, s);

const empty = (date: string): WidgetSnapshot => ({
  date,
  targetKcal: 2000,
  consumedKcal: 0,
  protein: { value: 0, target: 120 },
  carbs: { value: 0, target: 250 },
  fat: { value: 0, target: 65 },
  waterMl: 0,
  waterTargetMl: 2000,
  usual: [],
  loggedUsual: [],
  labels: DEFAULT_LABELS,
});

/** The snapshot for `today`: numbers from another day count as an empty day (targets kept). */
export function snapshotFor(today: string, s: WidgetSnapshot | null): WidgetSnapshot {
  if (!s) return empty(today);
  const base = { ...empty(today), ...s };
  if (base.date === today) return base;
  return {
    ...base,
    date: today,
    consumedKcal: 0,
    protein: { ...base.protein, value: 0 },
    carbs: { ...base.carbs, value: 0 },
    fat: { ...base.fat, value: 0 },
    waterMl: 0,
    loggedUsual: [],
  };
}

/**
 * Things done from a widget while the app was closed. The app applies them to its database the
 * next time it opens (and then syncs), so the widget never touches the database itself.
 */
export type WidgetAction =
  | { id: string; date: string; at: string; type: 'water'; ml: number }
  | { id: string; date: string; at: string; type: 'undoWater' }
  | { id: string; date: string; at: string; type: 'usual'; recordId: string; mealType: MealType };

export const readQueue = () => read<WidgetAction[]>(QUEUE_KEY) ?? [];
export const writeQueue = (q: WidgetAction[]) => write(QUEUE_KEY, q);
