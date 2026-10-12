import type { MealType } from './schemas/enums.ts';

/** Hour boundaries (local time) used to suggest a meal type. Argentine eating schedule. */
export const MEAL_TIME_WINDOWS: readonly { type: MealType; fromHour: number; toHour: number }[] = [
  { type: 'breakfast', fromHour: 5, toHour: 11 },
  { type: 'lunch', fromHour: 11, toHour: 16 },
  { type: 'snack', fromHour: 16, toHour: 20 },
  { type: 'dinner', fromHour: 20, toHour: 24 },
];

export function suggestMealType(hour: number): MealType {
  const w = MEAL_TIME_WINDOWS.find((x) => hour >= x.fromHour && hour < x.toHour);
  return w?.type ?? 'other';
}

/** Typical clock time of each meal, used when one description logs several meals at once. */
export const TYPICAL_MEAL_TIME: Record<MealType, { h: number; m: number }> = {
  breakfast: { h: 8, m: 30 },
  lunch: { h: 13, m: 0 },
  snack: { h: 17, m: 30 },
  dinner: { h: 21, m: 0 },
  other: { h: 11, m: 0 },
};

/** "now" when the meal is the one happening now, otherwise its typical time. */
export function timeForMealType(type: MealType, now: Date): { h: number; m: number } {
  return suggestMealType(now.getHours()) === type
    ? { h: now.getHours(), m: now.getMinutes() }
    : TYPICAL_MEAL_TIME[type];
}

/** Quick portion sizes shown in the review ("chica / mediana / grande") as factors of the estimate. */
export const PORTION_SIZES = [
  { key: 'small', factor: 0.67 },
  { key: 'medium', factor: 1 },
  { key: 'large', factor: 1.47 },
] as const;
export type PortionSize = (typeof PORTION_SIZES)[number]['key'];

/** Splits items into meals, keeping the order in which each meal first appears. */
export function groupByMealType<T>(
  items: readonly T[],
  typeOf: (item: T) => MealType,
): { mealType: MealType; items: T[] }[] {
  const groups: { mealType: MealType; items: T[] }[] = [];
  for (const item of items) {
    const type = typeOf(item);
    const group = groups.find((g) => g.mealType === type);
    if (group) group.items.push(item);
    else groups.push({ mealType: type, items: [item] });
  }
  return groups;
}

export interface MealHistoryEntry {
  id: string;
  mealType: MealType;
  /** ISO timestamp. */
  eatenAt: string;
  items: readonly { display_name: string; grams: number }[];
}

export interface FrequentMeal {
  /** Normalized, order-independent list of foods. */
  key: string;
  mealType: MealType;
  count: number;
  /** The most recent time it was eaten: the one we repeat. */
  latest: MealHistoryEntry;
}

export const FREQUENT_MEALS = {
  windowDays: 30,
  minCount: 2,
  max: 4,
  /** Extra weight for meals usually eaten at the current meal time. */
  sameMealBonus: 3,
} as const;

const mealKey = (m: MealHistoryEntry) =>
  m.items
    .map((i) => i.display_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim())
    .sort()
    .join('|');

/**
 * "Lo de siempre": meals with the same foods eaten at least twice in the last weeks, ranked by
 * how often, whether they fit the current meal time, and how recent they are.
 */
export function frequentMeals(
  history: readonly MealHistoryEntry[],
  now: Date,
  current: MealType = suggestMealType(now.getHours()),
): FrequentMeal[] {
  const since = now.getTime() - FREQUENT_MEALS.windowDays * 86_400_000;
  const byKey = new Map<string, { entries: MealHistoryEntry[] }>();
  for (const m of history) {
    const t = Date.parse(m.eatenAt);
    if (!m.items.length || Number.isNaN(t) || t < since || t > now.getTime()) continue;
    const key = mealKey(m);
    const g = byKey.get(key) ?? { entries: [] };
    g.entries.push(m);
    byKey.set(key, g);
  }
  const result: (FrequentMeal & { score: number })[] = [];
  for (const [key, { entries }] of byKey) {
    if (entries.length < FREQUENT_MEALS.minCount) continue;
    entries.sort((a, b) => Date.parse(b.eatenAt) - Date.parse(a.eatenAt));
    const counts = new Map<MealType, number>();
    for (const e of entries) counts.set(e.mealType, (counts.get(e.mealType) ?? 0) + 1);
    const mealType = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const latest = entries[0]!;
    const ageDays = (now.getTime() - Date.parse(latest.eatenAt)) / 86_400_000;
    const score =
      entries.length +
      (mealType === current ? FREQUENT_MEALS.sameMealBonus : 0) -
      ageDays / FREQUENT_MEALS.windowDays;
    result.push({ key, mealType, count: entries.length, latest, score });
  }
  return result
    .sort((a, b) => b.score - a.score)
    .slice(0, FREQUENT_MEALS.max)
    .map(({ score: _score, ...m }) => m);
}
