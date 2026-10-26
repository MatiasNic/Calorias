/**
 * Hours of the day for the water reminder: every `everyHours` from `fromHour` to `toHour`
 * (both inclusive). Empty when the window is inverted; the step is at least one hour.
 */
export function waterReminderHours(fromHour: number, toHour: number, everyHours: number): number[] {
  const step = Math.max(1, Math.floor(everyHours) || 1);
  const from = Math.max(0, Math.min(23, Math.floor(fromHour)));
  const to = Math.max(0, Math.min(23, Math.floor(toHour)));
  const hours: number[] = [];
  for (let h = from; h <= to; h += step) hours.push(h);
  return hours;
}
