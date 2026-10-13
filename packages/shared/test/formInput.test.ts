import { describe, expect, it } from 'vitest';

import {
  SUPPLEMENT_FORM,
  WORKOUT_LIMITS,
  compactStrengthExercises,
  distanceInputToKm,
  floorToTimeStep,
  formatTimeOfDay,
  loadInputToKg,
  nextScheduleTime,
  nonNegative,
  normalizeScheduleTimes,
  optionalCount,
  parseTimeOfDay,
  presetHasNutrition,
  toggleScheduleDay,
  workoutKcalToSave,
} from '../src/index.ts';

describe('workout form input', () => {
  it('converts loads to kg, rounding to 0.1 and capping', () => {
    expect(loadInputToKg(null, false)).toBe(0);
    expect(loadInputToKg(-5, false)).toBe(0);
    expect(loadInputToKg(82.46, false)).toBe(82.5);
    expect(loadInputToKg(100, true)).toBe(45.4);
    expect(loadInputToKg(99999, false)).toBe(WORKOUT_LIMITS.maxKg);
  });

  it('converts distances to km with 0.01 precision, null when not positive', () => {
    expect(distanceInputToKm(null, false)).toBeNull();
    expect(distanceInputToKm(0, false)).toBeNull();
    expect(distanceInputToKm(-1, true)).toBeNull();
    expect(distanceInputToKm(5.004, false)).toBe(5);
    expect(distanceInputToKm(1, true)).toBe(1.61);
  });

  it('prefers manual kcal and bounds the result', () => {
    expect(workoutKcalToSave(null, 312.4)).toBe(312);
    expect(workoutKcalToSave(250.6, 312)).toBe(251);
    expect(workoutKcalToSave(-10, 312)).toBe(0);
    expect(workoutKcalToSave(99999, 312)).toBe(WORKOUT_LIMITS.maxKcal);
  });

  it('floors minutes to the time step', () => {
    expect(floorToTimeStep(0)).toBe(0);
    expect(floorToTimeStep(14)).toBe(0);
    expect(floorToTimeStep(44)).toBe(30);
    expect(floorToTimeStep(59)).toBe(45);
    expect(floorToTimeStep(7, 5)).toBe(5);
  });

  it('drops sets without reps and exercises without sets', () => {
    expect(
      compactStrengthExercises([
        {
          key: 'squat',
          sets: [
            { reps: 5.4, kg: 100 },
            { reps: null, kg: 100 },
            { reps: 0, kg: 80 },
          ],
        },
        { key: 'bench_press', sets: [{ reps: null, kg: 60 }] },
      ]),
    ).toEqual([{ key: 'squat', sets: [{ reps: 5, kg: 100 }] }]);
  });
});

describe('supplement form input', () => {
  it('formats and parses times of day', () => {
    expect(formatTimeOfDay({ h: 8, m: 5 })).toBe('08:05');
    expect(parseTimeOfDay('21:30')).toEqual({ h: 21, m: 30 });
    expect(parseTimeOfDay('7')).toEqual({ h: 7, m: 0 });
    expect(formatTimeOfDay(parseTimeOfDay(SUPPLEMENT_FORM.defaultTime))).toBe('09:00');
  });

  it('offers the next time a few hours later, capped at 23 h', () => {
    expect(nextScheduleTime('09:15')).toBe('13:15');
    expect(nextScheduleTime('21:45')).toBe('23:45');
    expect(nextScheduleTime(undefined)).toBe('13:00');
  });

  it('normalizes times: unique and sorted', () => {
    expect(normalizeScheduleTimes(['21:00', '08:00', '21:00'])).toEqual(['08:00', '21:00']);
  });

  it('toggles weekdays where empty means every day', () => {
    expect(toggleScheduleDay([], 3)).toEqual([0, 1, 2, 4, 5, 6]);
    expect(toggleScheduleDay([1], 5)).toEqual([1, 5]);
    expect(toggleScheduleDay([1], 1)).toEqual([]);
    expect(toggleScheduleDay([0, 1, 2, 4, 5, 6], 3)).toEqual([]);
  });

  it('parses optional counts and non-negative amounts', () => {
    expect(optionalCount(null)).toBeNull();
    expect(optionalCount(-1)).toBeNull();
    expect(optionalCount(12.6)).toBe(13);
    expect(nonNegative(null)).toBe(0);
    expect(nonNegative(-3)).toBe(0);
    expect(nonNegative(2.5)).toBe(2.5);
  });

  it('knows which presets carry nutrition', () => {
    expect(presetHasNutrition('whey')).toBe(true);
    expect(presetHasNutrition('creatine')).toBe(false);
  });
});
