import { describe, expect, it } from 'vitest';
import {
  addDays,
  AiAnalysisSchema,
  aiAnalysisJsonSchema,
  computeStreak,
  dateRange,
  detectRestrictionPattern,
  diffDays,
  ACHIEVEMENTS,
  achievementProgress,
  computeAchievementStats,
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
  const base = {
    meals: [],
    waterByDate: new Map<string, number>(),
    weights: [],
    goalFor: () => ({ kcal: 2000, protein_g: 100, fiber_g: 25, water_ml: 2000 }),
    goalType: 'lose' as const,
    targetWeightKg: 70,
    longestStreak: 0,
    counts: { measurements: 0, recipes: 0, customFoods: 0, favorites: 0 },
  };
  const meal = (
    date: string,
    type: 'breakfast' | 'lunch' | 'dinner',
    kcal: number,
    protein: number,
    source: 'photo' | 'text' | 'barcode' = 'photo',
  ) => ({
    local_date: date,
    meal_type: type,
    source,
    totals: { kcal, protein_g: protein, fiber_g: 10 },
    items: [{ display_name: `food-${type}`, user_edited: type === 'lunch' }],
  });

  it('has around 120 achievements with unique ids, keeping legacy ids', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(110);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const legacy of ['first_meal', 'first_scan', 'streak_7', 'meals_50', 'first_recipe'])
      expect(ids).toContain(legacy);
  });

  it('computes stats from meals, water and weights', () => {
    const stats = computeAchievementStats({
      ...base,
      meals: [
        meal('2026-10-03', 'breakfast', 500, 30),
        meal('2026-10-03', 'lunch', 800, 40, 'text'),
        meal('2026-10-03', 'dinner', 700, 40, 'barcode'),
        meal('2026-10-05', 'lunch', 600, 20),
      ],
      waterByDate: new Map([
        ['2026-10-03', 2100],
        ['2026-10-05', 500],
      ]),
      weights: [
        { local_date: '2026-10-05', weight_kg: 72.4 },
        { local_date: '2026-10-01', weight_kg: 75 },
      ],
      longestStreak: 2,
    });
    expect(stats).toMatchObject({
      mealsLogged: 4,
      photoScans: 2,
      textLogs: 1,
      barcodeScans: 1,
      corrections: 2,
      loggedDays: 2,
      fullDays: 1,
      weekendDays: 1, // 2026-10-03 is a Saturday
      breakfastDays: 1,
      proteinDays: 1,
      calorieRangeDays: 1,
      waterDays: 1,
      weighIns: 2,
      goalProgressKg: 2,
      goalReached: 0,
      uniqueFoods: 3,
    });
  });

  it('only counts weight progress in the direction of the goal', () => {
    const weights = [
      { local_date: '2026-10-01', weight_kg: 70 },
      { local_date: '2026-10-08', weight_kg: 73 },
    ];
    expect(computeAchievementStats({ ...base, weights }).goalProgressKg).toBe(0);
    expect(
      computeAchievementStats({ ...base, weights, goalType: 'gain', targetWeightKg: 73 }),
    ).toMatchObject({ goalProgressKg: 3, goalReached: 1 });
    expect(computeAchievementStats({ ...base, weights, goalType: 'maintain' }).goalProgressKg).toBe(
      0,
    );
  });

  it('unlocks new achievements only, by threshold', () => {
    const stats = computeAchievementStats({
      ...base,
      meals: [meal('2026-10-05', 'lunch', 600, 20)],
      longestStreak: 3,
    });
    const fresh = evaluateAchievements(stats, new Set(['first_meal']));
    expect(fresh).toContain('first_scan');
    expect(fresh).toContain('streak_3');
    expect(fresh).not.toContain('first_meal');
    expect(fresh).not.toContain('streak_7');
    const streak7 = ACHIEVEMENTS.find((a) => a.id === 'streak_7')!;
    expect(achievementProgress(streak7, stats)).toBeCloseTo(3 / 7);
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
