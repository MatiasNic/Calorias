import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveTarget,
  movingAverage,
  projectGoalDate,
  weeklyRateKg,
  weightTrend,
  addDays,
} from '../src/index.ts';

describe('weightTrend', () => {
  it('smooths noise', () => {
    const t = weightTrend([
      { date: '2026-10-01', weightKg: 80 },
      { date: '2026-10-02', weightKg: 81 },
      { date: '2026-10-03', weightKg: 79 },
    ]);
    expect(t[0]!.trendKg).toBe(80);
    expect(t[1]!.trendKg).toBe(80.1);
    expect(t[2]!.trendKg).toBeCloseTo(79.99, 2);
  });
  it('keeps the last value per day and sorts', () => {
    const t = weightTrend([
      { date: '2026-10-02', weightKg: 70 },
      { date: '2026-10-01', weightKg: 71 },
      { date: '2026-10-02', weightKg: 69 },
    ]);
    expect(t.map((p) => p.weightKg)).toEqual([71, 69]);
  });
});

describe('movingAverage', () => {
  it('averages a trailing window', () => {
    const m = movingAverage(
      [
        { date: '2026-10-01', weightKg: 80 },
        { date: '2026-10-02', weightKg: 82 },
        { date: '2026-10-10', weightKg: 78 },
      ],
      7,
    );
    expect(m.map((p) => p.trendKg)).toEqual([80, 81, 78]);
  });
});

describe('weeklyRateKg & projection', () => {
  it('computes slope per week', () => {
    const pts = [0, 7, 14].map((d, i) => ({
      date: addDays('2026-09-01', d),
      weightKg: 0,
      trendKg: 80 - i * 0.5,
    }));
    expect(weeklyRateKg(pts)).toBeCloseTo(-0.5);
    expect(weeklyRateKg(pts.slice(0, 1))).toBeNull();
  });
  it('projects goal date only in the right direction', () => {
    const from = new Date(Date.UTC(2026, 9, 4));
    expect(projectGoalDate(80, 75, -0.5, from)).toBe('2026-12-13');
    expect(projectGoalDate(80, 75, 0.5, from)).toBeNull();
  });
});

describe('computeAdaptiveTarget', () => {
  const intakes = Array.from({ length: 21 }, (_, i) => ({
    date: addDays('2026-09-01', i),
    kcal: 2000,
    mealCount: 3,
  }));
  // Losing 0.5 kg/week steadily ≈ 550 kcal/day deficit → TDEE ≈ 2550
  const weights = Array.from({ length: 21 }, (_, i) => ({
    date: addDays('2026-09-01', i),
    weightKg: 80 - (0.5 / 7) * i,
  }));

  it('requires enough data', () => {
    const r = computeAdaptiveTarget({
      intakes: intakes.slice(0, 5),
      weights,
      plannedWeeklyChangeKg: -0.5,
      currentTargetKcal: 2000,
      sex: 'male',
      bmr: 1700,
    });
    expect(r.status).toBe('insufficient_data');
  });

  it('estimates TDEE from intake and trend and clamps the change', () => {
    const r = computeAdaptiveTarget({
      intakes,
      weights,
      plannedWeeklyChangeKg: -0.5,
      currentTargetKcal: 2000,
      sex: 'male',
      bmr: 1700,
    });
    if (r.status !== 'ok') throw new Error('expected ok');
    // EMA lags the raw data, so the observed TDEE is below the theoretical 2550.
    expect(r.observedTdee).toBeGreaterThan(2200);
    expect(r.observedTdee).toBeLessThan(2600);
    expect(Math.abs(r.deltaKcal)).toBeLessThanOrEqual(150);
  });

  it('never goes below the floor', () => {
    const r = computeAdaptiveTarget({
      intakes: intakes.map((d) => ({ ...d, kcal: 1300 })),
      weights: weights.map((w) => ({ ...w, weightKg: 80 })),
      plannedWeeklyChangeKg: -1,
      currentTargetKcal: 1550,
      sex: 'male',
      bmr: 1700,
    });
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.newTargetKcal).toBe(1500);
    expect(r.floorApplied).toBe(true);
  });
});
