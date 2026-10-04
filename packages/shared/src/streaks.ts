import { addDays, diffDays, type IsoDate } from './dates.ts';

export interface StreakInfo {
  current: number;
  longest: number;
  /** True when today is not logged yet but the streak is still alive (yesterday logged). */
  atRisk: boolean;
}

/**
 * Current streak counts consecutive logged days ending today — or ending yesterday if today
 * has not been logged yet (so the streak isn't "lost" in the morning).
 */
export function computeStreak(loggedDates: Iterable<IsoDate>, today: IsoDate): StreakInfo {
  const set = new Set(loggedDates);
  const sorted = [...set].filter((d) => d <= today).sort();

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev != null && diffDays(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  let anchor = today;
  let atRisk = false;
  if (!set.has(today)) {
    anchor = addDays(today, -1);
    atRisk = set.has(anchor);
  }
  let current = 0;
  for (let d = anchor; set.has(d); d = addDays(d, -1)) current += 1;

  return { current, longest, atRisk };
}
