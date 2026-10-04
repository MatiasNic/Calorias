import { describe, expect, it } from 'vitest';
import {
  clampGrams,
  confidenceLevel,
  per100FromTotals,
  scaleMicros,
  scaleNutrients,
  sumMicros,
  sumNutrients,
} from '../src/index.ts';

const milanesa = { kcal: 245, protein_g: 18, carbs_g: 12, fat_g: 14, fiber_g: 0.6 };

describe('portion scaling', () => {
  it('scales per 100 g values', () => {
    expect(scaleNutrients(milanesa, 160)).toEqual({
      kcal: 392,
      protein_g: 28.8,
      carbs_g: 19.2,
      fat_g: 22.4,
      fiber_g: 1,
    });
  });
  it('supports multipliers (½× and 2×)', () => {
    expect(scaleNutrients(milanesa, 75).kcal).toBe(184);
    expect(scaleNutrients(milanesa, 300).kcal).toBe(735);
  });
  it('treats negative grams as zero', () => {
    expect(scaleNutrients(milanesa, -5).kcal).toBe(0);
  });
  it('round-trips per100 from totals', () => {
    expect(per100FromTotals(scaleNutrients(milanesa, 200), 200).kcal).toBe(245);
  });
  it('sums totals that match the sum of items', () => {
    const a = scaleNutrients(milanesa, 160);
    const b = scaleNutrients({ kcal: 83, protein_g: 2, carbs_g: 15, fat_g: 1.5 }, 200);
    const total = sumNutrients([a, b]);
    expect(total.kcal).toBe(a.kcal + b.kcal);
    expect(total.protein_g).toBeCloseTo(a.protein_g + b.protein_g, 5);
  });
  it('scales and sums micros', () => {
    expect(scaleMicros({ iron_mg: 2.5 }, 200)).toEqual({ iron_mg: 5 });
    expect(sumMicros([{ iron_mg: 1 }, undefined, { iron_mg: 2, calcium_mg: 10 }])).toEqual({
      iron_mg: 3,
      calcium_mg: 10,
    });
  });
});

describe('confidenceLevel', () => {
  it('maps thresholds', () => {
    expect(confidenceLevel(0.9)).toBe('high');
    expect(confidenceLevel(0.6)).toBe('medium');
    expect(confidenceLevel(0.3)).toBe('low');
    expect(confidenceLevel(null)).toBe('high');
  });
});

describe('clampGrams', () => {
  it('clamps', () => {
    expect(clampGrams(-1)).toBe(0);
    expect(clampGrams(9999)).toBe(5000);
    expect(clampGrams(Number.NaN)).toBe(0);
    expect(clampGrams(12.6)).toBe(13);
  });
});
