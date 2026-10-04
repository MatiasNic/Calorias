import { describe, expect, it } from 'vitest';
import {
  addDays,
  AiAnalysisSchema,
  aiAnalysisJsonSchema,
  computeStreak,
  dateRange,
  detectRestrictionPattern,
  diffDays,
  evaluateAchievements,
  isIsoDate,
  localDate,
  MealCreateSchema,
  OnboardingSchema,
  startOfWeek,
  suggestMealType,
} from '../src/index.ts';

describe('dates', () => {
  it('computes the local date in a time zone', () => {
    const instant = new Date('2026-10-04T02:30:00Z');
    expect(localDate(instant, 'America/Argentina/Buenos_Aires')).toBe('2026-10-03');
    expect(localDate(instant, 'UTC')).toBe('2026-10-04');
    expect(localDate(instant, 'Not/AZone')).toBe('2026-10-04');
  });
  it('does date arithmetic', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-02-27', '2026-03-01')).toBe(2);
    expect(dateRange('2026-10-01', '2026-10-03')).toHaveLength(3);
    expect(startOfWeek('2026-10-04')).toBe('2026-09-28'); // Sunday → Monday before
    expect(startOfWeek('2026-09-28')).toBe('2026-09-28');
    expect(isIsoDate('2026-10-04')).toBe(true);
    expect(isIsoDate('04/10/2026')).toBe(false);
  });
});

describe('computeStreak', () => {
  it('counts consecutive days including today', () => {
    expect(computeStreak(['2026-10-02', '2026-10-03', '2026-10-04'], '2026-10-04')).toEqual({
      current: 3,
      longest: 3,
      atRisk: false,
    });
  });
  it('keeps the streak alive when today is not logged yet', () => {
    expect(computeStreak(['2026-10-02', '2026-10-03'], '2026-10-04')).toEqual({
      current: 2,
      longest: 2,
      atRisk: true,
    });
  });
  it('resets after a gap but remembers the longest', () => {
    const s = computeStreak(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-04'],
      '2026-10-04',
    );
    expect(s).toEqual({ current: 1, longest: 4, atRisk: false });
  });
  it('returns 0 with no logs', () => {
    expect(computeStreak([], '2026-10-04')).toEqual({ current: 0, longest: 0, atRisk: false });
  });
});

describe('detectRestrictionPattern', () => {
  const days = (kcal: number, n = 7) =>
    Array.from({ length: n }, (_, i) => ({ date: addDays('2026-09-28', i), kcal, mealCount: 2 }));
  it('flags sustained very low intake', () => {
    expect(detectRestrictionPattern(days(600))).toBe(true);
  });
  it('does not flag normal intake or too few days', () => {
    expect(detectRestrictionPattern(days(1600))).toBe(false);
    expect(detectRestrictionPattern(days(600, 3))).toBe(false);
  });
});

describe('achievements', () => {
  it('unlocks new achievements only', () => {
    const stats = {
      mealsLogged: 1,
      photoScans: 1,
      currentStreak: 3,
      proteinGoalHitToday: false,
      waterGoalHitToday: false,
      weighIns: 0,
      recipes: 0,
    };
    expect(evaluateAchievements(stats, new Set(['first_meal']))).toEqual([
      'first_scan',
      'streak_3',
    ]);
  });
});

describe('suggestMealType', () => {
  it('follows Argentine schedules', () => {
    expect(suggestMealType(8)).toBe('breakfast');
    expect(suggestMealType(13)).toBe('lunch');
    expect(suggestMealType(17)).toBe('snack');
    expect(suggestMealType(21)).toBe('dinner');
    expect(suggestMealType(3)).toBe('other');
  });
});

describe('schemas', () => {
  it('validates AI output and produces a JSON schema', () => {
    const sample = {
      is_food: true,
      dish_name: 'Milanesa con puré',
      items: [
        {
          name: 'Milanesa de carne frita',
          name_en: 'breaded fried beef cutlet',
          estimated_grams: 160,
          household_measure: '1 unidad mediana',
          cooking_method: 'fried',
          confidence: 0.82,
          per_100g_estimate: { kcal: 245, protein_g: 18, carbs_g: 12, fat_g: 14, fiber_g: 0.6 },
          search_hints: ['milanesa'],
        },
      ],
      hidden_ingredients_question: '¿Usaste aceite?',
      notes: null,
    };
    expect(AiAnalysisSchema.safeParse(sample).success).toBe(true);
    expect(
      AiAnalysisSchema.safeParse({ ...sample, items: [{ ...sample.items[0], confidence: 2 }] })
        .success,
    ).toBe(false);
    const js = aiAnalysisJsonSchema();
    expect(js.type).toBe('object');
    expect(Object.keys(js.properties as object)).toContain('items');
  });

  it('validates onboarding input', () => {
    const ok = OnboardingSchema.safeParse({
      goal: 'lose',
      sex: 'female',
      birthDate: '1990-05-01',
      heightCm: 165,
      weightKg: 70,
      targetWeightKg: 62,
      activity: 'light',
      weeklyRateKg: 0.5,
    });
    expect(ok.success).toBe(true);
    expect(OnboardingSchema.safeParse({ goal: 'lose' }).success).toBe(false);
  });

  it('requires at least one item per meal', () => {
    const r = MealCreateSchema.safeParse({
      id: '7f9c2f2e-8b8a-4a7b-9d55-6e1f0b6f2a11',
      eaten_at: '2026-10-04T12:00:00-03:00',
      meal_type: 'lunch',
      source: 'manual',
      items: [],
    });
    expect(r.success).toBe(false);
  });
});
