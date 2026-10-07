/**
 * Supplement tracking: schedules, daily checklist, adherence and stock. Pure functions.
 * The app never recommends supplements or doses; it only records what the user decides to take.
 */

export const SUPPLEMENT_UNITS = [
  'mg',
  'g',
  'mcg',
  'iu',
  'ml',
  'capsule',
  'tablet',
  'scoop',
  'drop',
  'serving',
] as const;
export type SupplementUnit = (typeof SUPPLEMENT_UNITS)[number];

/** Popular names offered as quick picks (free text is always allowed). */
export const SUPPLEMENT_PRESETS = [
  { key: 'whey', unit: 'scoop', amount: 1 },
  { key: 'creatine', unit: 'g', amount: 5 },
  { key: 'vitamin_d', unit: 'iu', amount: 1000 },
  { key: 'omega3', unit: 'capsule', amount: 1 },
  { key: 'magnesium', unit: 'mg', amount: 300 },
  { key: 'multivitamin', unit: 'tablet', amount: 1 },
  { key: 'iron', unit: 'mg', amount: 60 },
  { key: 'b12', unit: 'mcg', amount: 1000 },
  { key: 'caffeine', unit: 'mg', amount: 200 },
  { key: 'collagen', unit: 'g', amount: 10 },
  { key: 'electrolytes', unit: 'serving', amount: 1 },
  { key: 'zinc', unit: 'mg', amount: 15 },
] as const satisfies readonly { key: string; unit: SupplementUnit; amount: number }[];

export interface SupplementSchedule {
  /** Days of week it is taken: 0 = Sunday … 6 = Saturday. Empty = every day. */
  days: number[];
  /** Times of day "HH:MM". At least one. */
  times: string[];
}

export interface SupplementLike extends SupplementSchedule {
  id: string;
  active: boolean;
  /** Doses left (null = not tracking stock). */
  stock: number | null;
  low_stock_threshold: number | null;
  /** Date it was added (no doses are "missed" before it). */
  start_date: string;
}

export interface IntakeLike {
  supplement_id: string;
  local_date: string;
  /** Scheduled time it belongs to ("HH:MM"), or "extra". */
  slot: string;
}

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Whether a supplement is scheduled on a date. */
export function isDueOn(s: SupplementLike, date: string): boolean {
  if (!s.active || date < s.start_date) return false;
  return s.days.length === 0 || s.days.includes(weekday(date));
}

export interface ChecklistItem {
  supplementId: string;
  slot: string;
  taken: boolean;
}

/** Today's checklist: one row per scheduled time, sorted by time. */
export function dailyChecklist(
  supplements: readonly SupplementLike[],
  intakes: readonly IntakeLike[],
  date: string,
): ChecklistItem[] {
  const taken = new Set(
    intakes.filter((i) => i.local_date === date).map((i) => `${i.supplement_id}|${i.slot}`),
  );
  return supplements
    .filter((s) => isDueOn(s, date))
    .flatMap((s) =>
      [...s.times].sort().map((slot) => ({
        supplementId: s.id,
        slot,
        taken: taken.has(`${s.id}|${slot}`),
      })),
    )
    .sort((x, y) => x.slot.localeCompare(y.slot));
}

/** Share of scheduled doses taken between `from` and `to` (inclusive), 0..1; null if none were due. */
export function adherence(
  supplements: readonly SupplementLike[],
  intakes: readonly IntakeLike[],
  from: string,
  to: string,
): number | null {
  let due = 0;
  let done = 0;
  const takenKeys = new Set(intakes.map((i) => `${i.supplement_id}|${i.local_date}|${i.slot}`));
  for (let d = from; d <= to; d = nextDay(d)) {
    for (const s of supplements) {
      if (!isDueOn(s, d)) continue;
      for (const slot of s.times) {
        due++;
        if (takenKeys.has(`${s.id}|${d}|${slot}`)) done++;
      }
    }
  }
  return due === 0 ? null : done / due;
}

/** Days on which every scheduled dose was taken (for achievements). */
export function fullAdherenceDays(
  supplements: readonly SupplementLike[],
  intakes: readonly IntakeLike[],
): number {
  const dates = [...new Set(intakes.map((i) => i.local_date))];
  return dates.filter((d) => {
    const list = dailyChecklist(supplements, intakes, d);
    return list.length > 0 && list.every((c) => c.taken);
  }).length;
}

export function isLowStock(s: SupplementLike): boolean {
  return s.stock != null && s.stock <= (s.low_stock_threshold ?? 5);
}

/** Days of supply left at the current schedule (null if not tracking stock). */
export function daysOfSupply(s: SupplementLike): number | null {
  if (s.stock == null) return null;
  const perWeek = (s.days.length === 0 ? 7 : s.days.length) * Math.max(1, s.times.length);
  return Math.floor((s.stock / perWeek) * 7);
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
