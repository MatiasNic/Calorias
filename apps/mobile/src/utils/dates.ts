import { localDate, type IsoDate } from '@plato/shared';
import { getCalendars } from 'expo-localization';

import { currentLocale } from '@/i18n';

export function deviceTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? 'America/Argentina/Buenos_Aires';
}

export function todayLocal(now: Date = new Date()): IsoDate {
  return localDate(now, deviceTimeZone());
}

export function isoDateToDate(d: IsoDate): Date {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, day, 12);
}

/** Builds an ISO timestamp for `date` at the given local hour/minute (or now's time). */
export function timestampFor(date: IsoDate, time?: { h: number; m: number }): string {
  const now = new Date();
  const d = isoDateToDate(date);
  d.setHours(time?.h ?? now.getHours(), time?.m ?? now.getMinutes(), 0, 0);
  return d.toISOString();
}

export function formatDay(
  d: IsoDate,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
) {
  return new Intl.DateTimeFormat(currentLocale(), opts).format(isoDateToDate(d));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(currentLocale(), { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function weekdayShort(d: IsoDate) {
  return new Intl.DateTimeFormat(currentLocale(), { weekday: 'narrow' }).format(isoDateToDate(d));
}
