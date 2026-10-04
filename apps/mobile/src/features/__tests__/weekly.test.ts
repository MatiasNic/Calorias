import { weeklyReport, weeklySuggestion } from '../progress/weekly';
import { dayTotalsFrom } from '../progress/hooks';
import { DEFAULT_GOAL } from '../goals/hooks';
import type { MealRecord } from '@/services/db/types';

const day = (date: string, kcal: number, protein = 120) => ({
  date,
  totals: { kcal, protein_g: protein, carbs_g: 200, fat_g: 60 },
  mealCount: 3,
  targetKcal: 2000,
});

describe('weekly summary', () => {
  it('asks to log more when fewer than 4 days are logged', () => {
    const r = weeklyReport([day('2026-09-28', 2000)], '2026-09-28', '2026-10-04', 150);
    expect(r.suggestion).toBe('log_more');
  });
  it('detects sustained under-eating before anything else', () => {
    const days = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'].map((d) => day(d, 1200));
    expect(weeklyReport(days, '2026-09-28', '2026-10-04', 150).suggestion).toBe('under');
  });
  it('suggests protein when it is the main gap', () => {
    const days = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'].map((d) =>
      day(d, 2000, 80),
    );
    expect(weeklyReport(days, '2026-09-28', '2026-10-04', 150).suggestion).toBe('protein');
  });
  it('praises consistency', () => {
    const days = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'].map((d) =>
      day(d, 2050, 140),
    );
    const r = weeklyReport(days, '2026-09-28', '2026-10-04', 150);
    expect(r.summary.daysInRange).toBe(5);
    expect(weeklySuggestion(r.summary, 150)).toBe('consistency');
  });
});

describe('dayTotalsFrom', () => {
  it('aggregates meals per day with the goal of that day', () => {
    const meal = (date: string, kcal: number): MealRecord => ({
      id: date + kcal,
      eaten_at: `${date}T12:00:00Z`,
      local_date: date,
      meal_type: 'lunch',
      source: 'manual',
      photo_path: null,
      local_photo_uri: null,
      note: null,
      ai_scan_id: null,
      items: [],
      totals: { kcal, protein_g: 10, carbs_g: 10, fat_g: 10 },
    });
    const totals = dayTotalsFrom(
      [meal('2026-10-01', 500), meal('2026-10-01', 700), meal('2026-10-02', 300)],
      [{ ...DEFAULT_GOAL, kcal: 1800 }],
    );
    expect(totals.find((d) => d.date === '2026-10-01')).toMatchObject({
      mealCount: 2,
      targetKcal: 1800,
      totals: { kcal: 1200, protein_g: 20 },
    });
  });
});
