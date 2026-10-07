import { activityDef, kgToLb, type UnitSystem } from '@plato/shared';

import type { IconName } from '@/components';
import { currentLocale, i18next } from '@/i18n';
import type { SupplementRecord, WorkoutRecord } from '@/services/db/types';
import { isoDateToDate } from '@/utils/dates';
import { formatNumber } from '@/utils/format';

const CUSTOM_PREFIX = 'custom:';

export const customExerciseKey = (name: string) => `${CUSTOM_PREFIX}${name.trim()}`;

export function exerciseName(key: string): string {
  if (key.startsWith(CUSTOM_PREFIX)) return key.slice(CUSTOM_PREFIX.length);
  return i18next.t(`training.exerciseNames.${key}` as 'training.exerciseNames.squat', {
    defaultValue: key,
  });
}

export const activityName = (key: string) =>
  i18next.t(`training.activities.${activityDef(key).key}` as 'training.activities.other');

export const activityIcon = (key: string) => activityDef(key).icon as IconName;

export const workoutTitle = (w: Pick<WorkoutRecord, 'title' | 'activity'>) =>
  w.title?.trim() || activityName(w.activity);

/** "80 kg" / "176 lb" for a load stored in kg. */
export function formatLoad(kg: number, units: UnitSystem): string {
  return units === 'imperial' ? `${formatNumber(kgToLb(kg), 1)} lb` : `${formatNumber(kg, 1)} kg`;
}

export function supplementName(s: Pick<SupplementRecord, 'name' | 'preset'>): string {
  return s.name.trim() || (s.preset ? i18next.t(`supplements.presets.${s.preset}` as never) : '');
}

export function doseLabel(s: Pick<SupplementRecord, 'dose_amount' | 'dose_unit'>): string {
  const unit = i18next.t(`supplements.units.${s.dose_unit}` as 'supplements.units.mg', {
    count: s.dose_amount,
  });
  return `${formatNumber(s.dose_amount, 2)} ${unit}`;
}

/** Reference Sunday used to localize weekday names (0 = Sunday … 6 = Saturday). */
const SUNDAY = '2026-10-04';

export function weekdayName(day: number, style: 'short' | 'narrow' = 'short') {
  const d = isoDateToDate(SUNDAY);
  d.setDate(d.getDate() + day);
  return new Intl.DateTimeFormat(currentLocale(), { weekday: style }).format(d);
}

/** Week order starting on Monday. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
