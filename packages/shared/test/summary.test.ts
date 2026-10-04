import { describe, expect, it } from 'vitest';
import {
  dailySummary,
  fillDays,
  isInRange,
  periodSummary,
  previousPeriod,
  type DayTotals,
} from '../src/index.ts';

const target = { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 28 };

describe('dailySummary', () => {
  it('sums meals and computes remaining with exercise', () => {
    const s = dailySummary(
      [
        { meal_type: 'breakfast', totals: { kcal: 400, protein_g: 20, carbs_g: 50, fat_g: 12 } },
        {
          meal_type: 'lunch',
          totals: { kcal: 700, protein_g: 45, carbs_g: 60, fat_g: 25, fiber_g: 8 },
        },
        { meal_type: 'lunch', totals: { kcal: 100, protein_g: 1, carbs_g: 25, fat_g: 0 } },
      ],
      target,
      300,
    );
    expect(s.consumed.kcal).toBe(1200);
    expect(s.remainingKcal).toBe(1100);
    expect(s.byMealType.lunch?.kcal).toBe(800);
    expect(s.progress.protein).toBeCloseTo(66 / 150);
    expect(s.progress.kcal).toBeCloseTo(1200 / 2300);
    expect(s.mealCount).toBe(3);
  });
  it('handles an empty day', () => {
    const s = dailySummary([], target);
    expect(s.consumed.kcal).toBe(0);
    expect(s.remainingKcal).toBe(2000);
  });
});

describe('periodSummary', () => {
  const day = (date: string, kcal: number, mealCount = 3): DayTotals => ({
    date,
    totals: { kcal, protein_g: 100, carbs_g: 200, fat_g: 60 },
    mealCount,
    targetKcal: 2000,
  });

  it('averages logged days and computes adherence', () => {
    const days = [
      day('2026-09-28', 2100),
      day('2026-09-29', 2500),
      day('2026-09-30', 0, 0),
      day('2026-10-01', 1900),
    ];
    const s = periodSummary(days, '2026-09-28', '2026-10-04');
    expect(s.loggedDays).toBe(3);
    expect(s.totalDays).toBe(7);
    expect(s.avg.kcal).toBe(2167);
    expect(s.daysInRange).toBe(2);
    expect(s.adherence).toBeCloseTo(2 / 3);
    expect(s.best?.date).toBe('2026-09-28');
  });

  it('isInRange uses ±10%', () => {
    expect(isInRange(2200, 2000)).toBe(true);
    expect(isInRange(2201, 2000)).toBe(false);
    expect(isInRange(100, 0)).toBe(false);
  });

  it('fills missing days', () => {
    const filled = fillDays([day('2026-10-02', 1800)], '2026-10-01', '2026-10-03', 2000);
    expect(filled.map((d) => d.totals.kcal)).toEqual([0, 1800, 0]);
  });

  it('computes the previous period', () => {
    expect(previousPeriod('2026-09-28', '2026-10-04')).toEqual({
      from: '2026-09-21',
      to: '2026-09-27',
    });
  });
});
