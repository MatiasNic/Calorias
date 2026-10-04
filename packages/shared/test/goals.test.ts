import { describe, expect, it } from 'vitest';
import { computeGoalPlan, kcalFromMacros, splitMacros, type GoalPlanInput } from '../src/index.ts';

const base: GoalPlanInput = {
  sex: 'male',
  ageYears: 30,
  heightCm: 180,
  weightKg: 90,
  targetWeightKg: 80,
  activity: 'moderate',
  goal: 'lose',
  weeklyRateKg: 0.5,
  today: new Date(Date.UTC(2026, 9, 4)),
};

function plan(input: Partial<GoalPlanInput> = {}) {
  const r = computeGoalPlan({ ...base, ...input });
  if (!r.ok) throw new Error(`blocked: ${r.reason}`);
  return r.plan;
}

describe('computeGoalPlan', () => {
  it('computes deficit from the weekly rate', () => {
    const p = plan();
    // BMR = 900 + 1125 - 150 + 5 = 1880 ; TDEE = 2914 ; deficit 550 → 2364 → 2360
    expect(p.bmr).toBe(1880);
    expect(p.tdee).toBe(2914);
    expect(p.kcal).toBe(2360);
    expect(p.weeklyChangeKg).toBeCloseTo(-0.5, 1);
    expect(p.estimatedWeeks).toBe(20);
    expect(p.estimatedDate).toBe('2027-02-21');
    expect(p.warnings).toEqual([]);
    expect(p.projection[0]).toEqual({ week: 0, weightKg: 90 });
    expect(p.projection.at(-1)?.weightKg).toBe(80);
  });

  it('caps loss at 1% of body weight per week', () => {
    const p = plan({ weeklyRateKg: 1.5 });
    expect(p.warnings).toContain('rate_capped');
    expect(p.warnings).toContain('aggressive_rate');
    expect(p.weeklyChangeKg).toBeGreaterThanOrEqual(-0.9);
  });

  it('applies the calorie floor for women and warns', () => {
    const p = plan({
      sex: 'female',
      heightCm: 155,
      weightKg: 58,
      targetWeightKg: 52,
      activity: 'sedentary',
      weeklyRateKg: 0.55,
    });
    expect(p.kcal).toBe(1200);
    expect(p.warnings).toContain('calorie_floor_applied');
  });

  it('applies the male floor of 1500 kcal', () => {
    const p = plan({
      heightCm: 160,
      weightKg: 62,
      targetWeightKg: 56,
      activity: 'sedentary',
      ageYears: 70,
      weeklyRateKg: 0.6,
    });
    expect(p.kcal).toBeGreaterThanOrEqual(1500);
  });

  it('blocks a target BMI under 18.5', () => {
    const r = computeGoalPlan({ ...base, heightCm: 175, weightKg: 65, targetWeightKg: 55 });
    expect(r).toEqual({ ok: false, reason: 'target_bmi_too_low' });
  });

  it('blocks weight loss for an underweight person', () => {
    const r = computeGoalPlan({ ...base, heightCm: 175, weightKg: 54, targetWeightKg: null });
    expect(r).toEqual({ ok: false, reason: 'underweight_cannot_lose' });
  });

  it('blocks users under the minimum age', () => {
    expect(computeGoalPlan({ ...base, ageYears: 15 })).toEqual({
      ok: false,
      reason: 'under_min_age',
    });
  });

  it('gives minors maintenance instead of a deficit', () => {
    const p = plan({ ageYears: 17 });
    expect(p.effectiveGoal).toBe('maintain');
    expect(Math.abs(p.kcal - p.tdee)).toBeLessThanOrEqual(5);
    expect(p.warnings).toContain('minor_no_deficit');
  });

  it('adds a surplus for gaining and caps the rate', () => {
    const p = plan({ goal: 'gain', targetWeightKg: 95, weeklyRateKg: 1 });
    expect(p.kcal).toBeGreaterThan(p.tdee);
    expect(p.warnings).toContain('gain_rate_capped');
    expect(p.weeklyChangeKg).toBeCloseTo(0.5, 1);
  });

  it('ignores inconsistent targets', () => {
    const p = plan({ targetWeightKg: 95 });
    expect(p.warnings).toContain('target_inconsistent');
    expect(p.estimatedWeeks).toBeNull();
  });

  it('maintains at TDEE', () => {
    const p = plan({ goal: 'maintain', targetWeightKg: null });
    expect(p.kcal).toBe(Math.round(2914 / 10) * 10);
    expect(p.weeklyChangeKg).toBeCloseTo(0, 1);
  });

  it('rejects absurd input', () => {
    expect(computeGoalPlan({ ...base, heightCm: 20 })).toEqual({
      ok: false,
      reason: 'invalid_input',
    });
  });
});

describe('splitMacros', () => {
  it('splits calories with fat >= 25% and protein by goal', () => {
    const m = splitMacros({ kcal: 2400, goal: 'lose', weightKg: 80, heightCm: 180 });
    expect(m.protein_g).toBe(160);
    expect((m.fat_g * 9) / 2400).toBeGreaterThanOrEqual(0.25);
    expect(Math.abs(kcalFromMacros(m) - 2400)).toBeLessThan(15);
    expect(m.fiber_g).toBe(34);
  });

  it('uses an adjusted reference weight for high BMI', () => {
    const m = splitMacros({ kcal: 2400, goal: 'maintain', weightKg: 130, heightCm: 170 });
    // ref weight = 27 * 1.7^2 = 78.03 kg → 1.6 g/kg = 124.8 g
    expect(m.protein_g).toBe(125);
  });

  it('keeps carbs >= 15% at low calories', () => {
    const m = splitMacros({ kcal: 1200, goal: 'lose', weightKg: 100, heightCm: 190 });
    expect((m.carbs_g * 4) / 1200).toBeGreaterThanOrEqual(0.149);
  });

  it('handles keto', () => {
    const m = splitMacros({
      kcal: 2000,
      goal: 'lose',
      weightKg: 80,
      heightCm: 180,
      dietaryPreferences: ['keto'],
    });
    expect(m.carbs_g).toBe(25);
    expect(m.fat_g).toBeGreaterThan(m.protein_g);
  });
});
