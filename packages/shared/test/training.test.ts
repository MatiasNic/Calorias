import { describe, expect, it } from 'vitest';

import {
  activityDef,
  adherence,
  dailyChecklist,
  dailyExerciseKcal,
  daysOfSupply,
  estimated1RM,
  fullAdherenceDays,
  isDueOn,
  isLowStock,
  personalRecords,
  strengthVolume,
  trainingStats,
  workoutKcal,
  type SupplementLike,
} from '../src/index.ts';

describe('workoutKcal', () => {
  it('uses net METs: (MET-1) x kg x hours', () => {
    // running moderate = 9.8 MET; 70 kg, 30 min → 8.8 * 70 * 0.5 = 308
    expect(workoutKcal('running', 'moderate', 30, 70)).toBe(308);
  });
  it('falls back to "other" for unknown activities and caps absurd durations', () => {
    expect(activityDef('nope').key).toBe('other');
    expect(workoutKcal('walking', 'light', 6000, 70)).toBe(
      workoutKcal('walking', 'light', 600, 70),
    );
    expect(workoutKcal('walking', 'light', 0, 70)).toBe(0);
  });
});

describe('strength', () => {
  const workouts = [
    { local_date: '2026-10-01', exercises: [{ key: 'squat', sets: [{ reps: 5, kg: 100 }] }] },
    {
      local_date: '2026-10-05',
      exercises: [
        {
          key: 'squat',
          sets: [
            { reps: 3, kg: 110 },
            { reps: 8, kg: 80 },
          ],
        },
        { key: 'push_up', sets: [{ reps: 25, kg: 0 }] },
      ],
    },
  ];
  it('estimates 1RM (Epley) and volume', () => {
    expect(estimated1RM({ reps: 1, kg: 120 })).toBe(120);
    expect(estimated1RM({ reps: 5, kg: 100 })).toBe(116.7);
    expect(estimated1RM({ reps: 10, kg: 0 })).toBe(0);
    expect(strengthVolume(workouts[1]!.exercises)).toBe(3 * 110 + 8 * 80);
  });
  it('tracks personal records with the date of the best e1RM', () => {
    const prs = personalRecords(workouts);
    const squat = prs.find((p) => p.key === 'squat')!;
    expect(squat).toMatchObject({ maxKg: 110, maxReps: 8, date: '2026-10-05', e1rm: 121 });
    expect(prs.find((p) => p.key === 'push_up')).toMatchObject({ maxReps: 25, e1rm: 0 });
  });
  it('summarises training', () => {
    const s = trainingStats([
      { local_date: '2026-10-01', duration_min: 45, kcal: 300, exercises: workouts[0]!.exercises },
      { local_date: '2026-10-01', duration_min: 30, kcal: 200 },
      { local_date: '2026-10-02', duration_min: 20, kcal: 100 },
    ]);
    expect(s).toEqual({ sessions: 3, minutes: 95, kcal: 600, activeDays: 2, volumeKg: 500 });
  });
  it('does not double count logged and health exercise', () => {
    expect(dailyExerciseKcal(300, 450)).toBe(300);
    expect(dailyExerciseKcal(0, 450)).toBe(450);
    expect(dailyExerciseKcal(0, null)).toBe(0);
  });
});

describe('supplements', () => {
  const creatine: SupplementLike = {
    id: 'c',
    active: true,
    days: [],
    times: ['08:00'],
    stock: 4,
    low_stock_threshold: 5,
    start_date: '2026-10-01',
  };
  const vitD: SupplementLike = {
    id: 'd',
    active: true,
    days: [1, 3, 5], // Mon, Wed, Fri
    times: ['21:00', '09:00'],
    stock: null,
    low_stock_threshold: null,
    start_date: '2026-10-01',
  };
  it('knows which days a supplement is due', () => {
    expect(isDueOn(vitD, '2026-10-05')).toBe(true); // Monday
    expect(isDueOn(vitD, '2026-10-06')).toBe(false); // Tuesday
    expect(isDueOn(creatine, '2026-09-30')).toBe(false); // before start
    expect(isDueOn({ ...creatine, active: false }, '2026-10-05')).toBe(false);
  });
  it('builds a sorted daily checklist with taken marks', () => {
    const list = dailyChecklist(
      [creatine, vitD],
      [{ supplement_id: 'd', local_date: '2026-10-05', slot: '09:00' }],
      '2026-10-05',
    );
    expect(list).toEqual([
      { supplementId: 'c', slot: '08:00', taken: false },
      { supplementId: 'd', slot: '09:00', taken: true },
      { supplementId: 'd', slot: '21:00', taken: false },
    ]);
  });
  it('computes adherence and full days', () => {
    const intakes = [
      { supplement_id: 'c', local_date: '2026-10-05', slot: '08:00' },
      { supplement_id: 'd', local_date: '2026-10-05', slot: '09:00' },
      { supplement_id: 'd', local_date: '2026-10-05', slot: '21:00' },
      { supplement_id: 'c', local_date: '2026-10-06', slot: '08:00' },
    ];
    // Mon: 3 due 3 taken; Tue: 1 due 1 taken → 4/4
    expect(adherence([creatine, vitD], intakes, '2026-10-05', '2026-10-06')).toBe(1);
    // Wed adds 3 due, 0 taken → 4/7
    expect(adherence([creatine, vitD], intakes, '2026-10-05', '2026-10-07')).toBeCloseTo(4 / 7);
    expect(adherence([], intakes, '2026-10-05', '2026-10-07')).toBeNull();
    expect(fullAdherenceDays([creatine, vitD], intakes)).toBe(2);
  });
  it('flags low stock and estimates days of supply', () => {
    expect(isLowStock(creatine)).toBe(true);
    expect(daysOfSupply(creatine)).toBe(4);
    expect(daysOfSupply({ ...vitD, stock: 12 })).toBe(14); // 6 doses/week
    expect(daysOfSupply(vitD)).toBeNull();
  });
});
