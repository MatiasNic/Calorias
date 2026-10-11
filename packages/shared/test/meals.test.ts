import { describe, expect, it } from 'vitest';

import {
  FREQUENT_MEALS,
  frequentMeals,
  groupByMealType,
  mockAnalyzeText,
  timeForMealType,
  TYPICAL_MEAL_TIME,
  type MealHistoryEntry,
} from '../src/index.ts';

const NOW = new Date('2026-10-10T13:20:00');
const daysAgo = (d: number, h = 13) => {
  const t = new Date(NOW);
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};
const meal = (
  id: string,
  mealType: MealHistoryEntry['mealType'],
  eatenAt: string,
  names: string[],
): MealHistoryEntry => ({
  id,
  mealType,
  eatenAt,
  items: names.map((n) => ({ display_name: n, grams: 100 })),
});

describe('frequentMeals', () => {
  it('finds repeated meals regardless of item order and accents', () => {
    const r = frequentMeals(
      [
        meal('a', 'breakfast', daysAgo(1, 8), ['Café con leche', 'Medialuna']),
        meal('b', 'breakfast', daysAgo(2, 8), ['medialuna', 'cafe con leche']),
        meal('c', 'lunch', daysAgo(1), ['Milanesa', 'Puré']),
      ],
      NOW,
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.count).toBe(2);
    expect(r[0]!.latest.id).toBe('a');
    expect(r[0]!.mealType).toBe('breakfast');
  });

  it('prefers meals of the current meal time and ignores old ones', () => {
    const r = frequentMeals(
      [
        meal('b1', 'breakfast', daysAgo(1, 8), ['Tostadas']),
        meal('b2', 'breakfast', daysAgo(2, 8), ['Tostadas']),
        meal('b3', 'breakfast', daysAgo(3, 8), ['Tostadas']),
        meal('l1', 'lunch', daysAgo(1), ['Ensalada']),
        meal('l2', 'lunch', daysAgo(4), ['Ensalada']),
        meal('old1', 'lunch', daysAgo(FREQUENT_MEALS.windowDays + 2), ['Guiso']),
        meal('old2', 'lunch', daysAgo(FREQUENT_MEALS.windowDays + 3), ['Guiso']),
      ],
      NOW,
    );
    expect(r.map((m) => m.latest.id)).toEqual(['l1', 'b1']);
  });
});

describe('meal grouping and times', () => {
  it('groups items by meal keeping first-appearance order', () => {
    const g = groupByMealType(
      [
        { n: 'cafe', t: 'breakfast' as const },
        { n: 'milanesa', t: 'dinner' as const },
        { n: 'medialuna', t: 'breakfast' as const },
      ],
      (x) => x.t,
    );
    expect(g.map((x) => [x.mealType, x.items.map((i) => i.n)])).toEqual([
      ['breakfast', ['cafe', 'medialuna']],
      ['dinner', ['milanesa']],
    ]);
  });

  it('uses the current time only for the meal happening now', () => {
    expect(timeForMealType('lunch', NOW)).toEqual({ h: 13, m: 20 });
    expect(timeForMealType('breakfast', NOW)).toEqual(TYPICAL_MEAL_TIME.breakfast);
  });
});

describe('demo text parser', () => {
  it('splits several meals and understands household measures', () => {
    const r = mockAnalyzeText(
      'Desayuné café con leche y dos medialunas, y a la noche cené media milanesa con puré',
    );
    expect(r.items.map((i) => [i.name, i.meal_type])).toEqual([
      ['Café con leche', 'breakfast'],
      ['Medialuna de manteca', 'breakfast'],
      ['Milanesa de carne', 'dinner'],
      ['Puré de papa', 'dinner'],
    ]);
    expect(r.items[1]!.estimated_grams).toBe(80);
    expect(r.items[2]!.estimated_grams).toBe(75);
    expect(r.quick_answers.length).toBeGreaterThan(0);
  });

  it('keeps meal_type null for a single meal', () => {
    const r = mockAnalyzeText('un plato hondo de fideos');
    expect(r.items[0]!.meal_type).toBeNull();
    expect(r.items[0]!.estimated_grams).toBe(420);
  });
});
