import { describe, expect, it } from 'vitest';
import { ageFromBirthDate, bmi, bmrMifflinStJeor, tdee, weightForBmi } from '../src/index.ts';

describe('bmrMifflinStJeor', () => {
  it('matches the reference formula for a male', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmrMifflinStJeor({ sex: 'male', ageYears: 30, heightCm: 180, weightKg: 80 })).toBe(1780);
  });
  it('matches the reference formula for a female', () => {
    // 10*60 + 6.25*165 - 5*28 - 161 = 1330.25
    expect(
      bmrMifflinStJeor({ sex: 'female', ageYears: 28, heightCm: 165, weightKg: 60 }),
    ).toBeCloseTo(1330.25);
  });
});

describe('tdee', () => {
  it('applies activity factors', () => {
    expect(tdee(1000, 'sedentary')).toBe(1200);
    expect(tdee(1000, 'moderate')).toBe(1550);
    expect(tdee(1000, 'very_active')).toBe(1900);
  });
});

describe('bmi helpers', () => {
  it('computes BMI and inverse', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.857, 2);
    expect(weightForBmi(18.5, 170)).toBeCloseTo(53.465, 2);
  });
});

describe('ageFromBirthDate', () => {
  it('counts full years', () => {
    const on = new Date(Date.UTC(2026, 9, 4));
    expect(ageFromBirthDate('1996-10-04', on)).toBe(30);
    expect(ageFromBirthDate('1996-10-05', on)).toBe(29);
    expect(ageFromBirthDate('2008-01-01', on)).toBe(18);
  });
});
