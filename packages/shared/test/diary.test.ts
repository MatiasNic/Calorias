import { describe, expect, it } from 'vitest';

import { annualSavingsPercent, nextMealTypeToLog, sortMealsForDay } from '../src/index.ts';

describe('sortMealsForDay', () => {
  it('orders by meal type, then by time eaten, without mutating the input', () => {
    const meals = [
      { id: 'd', meal_type: 'dinner' as const, eaten_at: '2026-10-10T21:00:00Z' },
      { id: 'l2', meal_type: 'lunch' as const, eaten_at: '2026-10-10T14:00:00Z' },
      { id: 'b', meal_type: 'breakfast' as const, eaten_at: '2026-10-10T08:00:00Z' },
      { id: 'l1', meal_type: 'lunch' as const, eaten_at: '2026-10-10T13:00:00Z' },
      { id: 'o', meal_type: 'other' as const, eaten_at: '2026-10-10T07:00:00Z' },
    ];
    expect(sortMealsForDay(meals).map((m) => m.id)).toEqual(['b', 'l1', 'l2', 'd', 'o']);
    expect(meals[0]!.id).toBe('d');
  });
});

describe('nextMealTypeToLog', () => {
  it('suggests the meal of the current hour when nothing is logged', () => {
    expect(nextMealTypeToLog([], 9)).toBe('breakfast');
    expect(nextMealTypeToLog([], 13)).toBe('lunch');
  });

  it('skips meals already logged, moving forward from the current one', () => {
    expect(nextMealTypeToLog(['breakfast'], 9)).toBe('lunch');
    expect(nextMealTypeToLog(['lunch', 'snack'], 12)).toBe('dinner');
  });

  it('never goes back to earlier meals and falls back to the current one', () => {
    expect(nextMealTypeToLog(['dinner'], 21)).toBe('dinner');
    expect(nextMealTypeToLog(['breakfast', 'lunch', 'snack', 'dinner'], 9)).toBe('breakfast');
  });

  it('suggests "other" late at night', () => {
    expect(nextMealTypeToLog([], 2)).toBe('other');
  });
});

describe('annualSavingsPercent', () => {
  it('compares the yearly price with twelve monthly payments', () => {
    expect(annualSavingsPercent(60, 10)).toBe(50);
    expect(annualSavingsPercent(119.99, 14.99)).toBe(33);
  });

  it('returns null without a monthly price', () => {
    expect(annualSavingsPercent(60, 0)).toBeNull();
  });
});
