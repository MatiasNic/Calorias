import { kvStorage } from '@/stores/kv';

/**
 * What the home-screen widgets show. The app writes it whenever today's numbers change; the
 * widget task (which runs without the app open) only reads it, so widgets render instantly.
 */
export interface WidgetSnapshot {
  /** Day the numbers belong to ("YYYY-MM-DD"); another day means "nothing logged yet". */
  date: string;
  userId: string | null;
  targetKcal: number;
  consumedKcal: number;
  waterMl: number;
  waterTargetMl: number;
  /** Texts in the user's language (the widget task has no i18n). */
  labels: WidgetLabels;
}

export interface WidgetLabels {
  left: string;
  over: string;
  consumed: string;
  goal: string;
  talk: string;
  photo: string;
  write: string;
  water: string;
}

export const DEFAULT_LABELS: WidgetLabels = {
  left: 'Te quedan',
  over: 'Por encima del objetivo',
  consumed: 'consumidas',
  goal: 'Objetivo',
  talk: 'Hablar',
  photo: 'Foto',
  write: 'Escribir',
  water: 'Agua',
};

const KEY = 'bocado.widget';

export function readSnapshot(): WidgetSnapshot | null {
  try {
    const raw = kvStorage.getItemSync(KEY);
    return raw ? (JSON.parse(raw) as WidgetSnapshot) : null;
  } catch {
    return null;
  }
}

export function writeSnapshot(s: WidgetSnapshot) {
  try {
    kvStorage.setItemSync(KEY, JSON.stringify(s));
  } catch {
    // widgets are best-effort
  }
}

/** The snapshot for `today`: numbers from another day count as an empty day. */
export function snapshotFor(today: string, s: WidgetSnapshot | null): WidgetSnapshot {
  const base: WidgetSnapshot = s ?? {
    date: today,
    userId: null,
    targetKcal: 2000,
    consumedKcal: 0,
    waterMl: 0,
    waterTargetMl: 2000,
    labels: DEFAULT_LABELS,
  };
  return base.date === today ? base : { ...base, date: today, consumedKcal: 0, waterMl: 0 };
}
