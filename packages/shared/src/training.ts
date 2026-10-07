/**
 * Workout logging: activity catalog with MET values, calorie estimation, strength volume and
 * personal records. Pure functions, shared by the app and the server.
 *
 * Calories use NET METs ((MET − 1) × kg × hours): the resting energy is already part of the
 * user's daily target, so counting gross METs would double count it.
 * MET values: Compendium of Physical Activities (Ainsworth et al., 2011 / 2024 update).
 */

export const WORKOUT_INTENSITIES = ['light', 'moderate', 'vigorous'] as const;
export type WorkoutIntensity = (typeof WORKOUT_INTENSITIES)[number];

export type ActivityKind = 'cardio' | 'strength' | 'sport' | 'mind' | 'other';

export interface ActivityDef {
  key: string;
  kind: ActivityKind;
  icon: string;
  /** MET by intensity: light, moderate, vigorous. */
  met: readonly [number, number, number];
  /** Shows the distance field. */
  distance?: boolean;
}

const a = (
  key: string,
  kind: ActivityKind,
  icon: string,
  met: readonly [number, number, number],
  distance = false,
): ActivityDef => ({ key, kind, icon, met, distance });

export const ACTIVITIES: readonly ActivityDef[] = [
  a('walking', 'cardio', 'walk', [2.8, 3.5, 5.0], true),
  a('running', 'cardio', 'speedometer', [7.0, 9.8, 11.5], true),
  a('cycling', 'cardio', 'bicycle', [4.0, 6.8, 10.0], true),
  a('spinning', 'cardio', 'bicycle', [6.8, 8.5, 10.0]),
  a('swimming', 'cardio', 'water', [5.8, 7.0, 9.8], true),
  a('elliptical', 'cardio', 'repeat', [4.6, 5.0, 6.0]),
  a('rowing', 'cardio', 'boat', [4.8, 7.0, 8.5], true),
  a('hiking', 'cardio', 'trail-sign', [5.3, 6.0, 7.8], true),
  a('stairs', 'cardio', 'trending-up', [4.0, 8.0, 9.0]),
  a('jump_rope', 'cardio', 'pulse', [8.8, 11.8, 12.3]),
  a('strength', 'strength', 'barbell', [3.5, 5.0, 6.0]),
  a('functional', 'strength', 'fitness', [4.0, 5.5, 7.0]),
  a('crossfit', 'strength', 'flame', [5.5, 8.0, 10.0]),
  a('hiit', 'strength', 'flash', [6.0, 8.0, 10.0]),
  a('calisthenics', 'strength', 'body', [3.8, 5.0, 8.0]),
  a('football', 'sport', 'football', [7.0, 8.0, 10.0]),
  a('padel', 'sport', 'tennisball', [5.0, 6.0, 7.3]),
  a('tennis', 'sport', 'tennisball', [5.0, 7.3, 8.0]),
  a('basketball', 'sport', 'basketball', [6.0, 6.5, 8.0]),
  a('volleyball', 'sport', 'baseball', [3.0, 4.0, 6.0]),
  a('hockey', 'sport', 'golf', [7.0, 8.0, 10.0]),
  a('rugby', 'sport', 'american-football', [6.3, 8.3, 8.3]),
  a('martial_arts', 'sport', 'hand-right', [5.3, 7.8, 10.3]),
  a('boxing', 'sport', 'hand-left', [5.5, 7.8, 12.0]),
  a('climbing', 'sport', 'triangle', [5.8, 7.5, 8.0]),
  a('dance', 'sport', 'musical-notes', [4.5, 5.5, 7.8]),
  a('yoga', 'mind', 'leaf', [2.0, 2.5, 4.0]),
  a('pilates', 'mind', 'body', [2.8, 3.0, 3.8]),
  a('stretching', 'mind', 'accessibility', [2.3, 2.3, 2.8]),
  a('other', 'other', 'ellipsis-horizontal', [3.0, 4.5, 6.0]),
];

const BY_KEY = new Map(ACTIVITIES.map((d) => [d.key, d]));

export function activityDef(key: string): ActivityDef {
  return BY_KEY.get(key) ?? BY_KEY.get('other')!;
}

/** Bounds that keep a typo from producing absurd numbers. */
export const WORKOUT_LIMITS = { maxMinutes: 600, maxKcal: 5000, maxSets: 30, maxKg: 1000 } as const;

/** Form defaults: weight used for estimates before the user logs one, and a typical session. */
export const WORKOUT_DEFAULTS = { weightKg: 70, minutes: 45, minutesStep: 5 } as const;

/** Estimated net kcal burned by a workout. */
export function workoutKcal(
  activityKey: string,
  intensity: WorkoutIntensity,
  minutes: number,
  weightKg: number,
): number {
  if (!(minutes > 0) || !(weightKg > 0)) return 0;
  const met = activityDef(activityKey).met[WORKOUT_INTENSITIES.indexOf(intensity)] ?? 3;
  const mins = Math.min(minutes, WORKOUT_LIMITS.maxMinutes);
  return Math.round(Math.max(0, met - 1) * weightKg * (mins / 60));
}

// ── Strength ────────────────────────────────────────────────────────────────

/** Common gym exercises (names in i18n under `training.exercises.<key>`); users can add custom ones. */
export const STRENGTH_EXERCISES = [
  'bench_press',
  'incline_bench_press',
  'dumbbell_press',
  'chest_fly',
  'push_up',
  'dips',
  'overhead_press',
  'lateral_raise',
  'face_pull',
  'pull_up',
  'lat_pulldown',
  'barbell_row',
  'seated_row',
  'shrug',
  'deadlift',
  'romanian_deadlift',
  'squat',
  'front_squat',
  'leg_press',
  'lunge',
  'bulgarian_split_squat',
  'leg_extension',
  'leg_curl',
  'hip_thrust',
  'calf_raise',
  'biceps_curl',
  'hammer_curl',
  'triceps_pushdown',
  'skull_crusher',
  'crunch',
] as const;

export interface StrengthSet {
  reps: number;
  kg: number;
}

export interface StrengthExercise {
  /** Catalog key (`STRENGTH_EXERCISES`) or `custom:<name>`. */
  key: string;
  sets: StrengthSet[];
}

/** Estimated one-rep max (Epley). Bodyweight sets (0 kg) return 0. */
export function estimated1RM(set: StrengthSet): number {
  if (!(set.kg > 0) || !(set.reps > 0)) return 0;
  if (set.reps === 1) return set.kg;
  return Math.round(set.kg * (1 + set.reps / 30) * 10) / 10;
}

/** Total volume (Σ reps × kg) of a list of exercises. */
export function strengthVolume(exercises: readonly StrengthExercise[]): number {
  return Math.round(
    exercises.reduce(
      (s, e) => s + e.sets.reduce((t, set) => t + Math.max(0, set.reps) * Math.max(0, set.kg), 0),
      0,
    ),
  );
}

export interface PersonalRecord {
  key: string;
  /** Best estimated 1RM. */
  e1rm: number;
  /** Heaviest weight lifted (any reps). */
  maxKg: number;
  /** Most reps in one set (useful for bodyweight exercises). */
  maxReps: number;
  date: string;
}

/** Personal records per exercise across workouts (`date` = when the best e1RM was set). */
export function personalRecords(
  workouts: readonly { local_date: string; exercises?: readonly StrengthExercise[] | null }[],
): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  const sorted = [...workouts].sort((x, y) => x.local_date.localeCompare(y.local_date));
  for (const w of sorted) {
    for (const ex of w.exercises ?? []) {
      for (const set of ex.sets) {
        const prev = best.get(ex.key) ?? {
          key: ex.key,
          e1rm: 0,
          maxKg: 0,
          maxReps: 0,
          date: w.local_date,
        };
        const e = estimated1RM(set);
        best.set(ex.key, {
          key: ex.key,
          e1rm: Math.max(prev.e1rm, e),
          maxKg: Math.max(prev.maxKg, set.kg),
          maxReps: Math.max(prev.maxReps, set.reps),
          date: e > prev.e1rm ? w.local_date : prev.date,
        });
      }
    }
  }
  return [...best.values()].sort((x, y) => y.e1rm - x.e1rm || y.maxReps - x.maxReps);
}

// ── Stats ───────────────────────────────────────────────────────────────────

export interface TrainingStats {
  sessions: number;
  minutes: number;
  kcal: number;
  activeDays: number;
  volumeKg: number;
}

export function trainingStats(
  workouts: readonly {
    local_date: string;
    duration_min: number;
    kcal: number;
    exercises?: readonly StrengthExercise[] | null;
  }[],
): TrainingStats {
  return {
    sessions: workouts.length,
    minutes: Math.round(workouts.reduce((s, w) => s + w.duration_min, 0)),
    kcal: Math.round(workouts.reduce((s, w) => s + w.kcal, 0)),
    activeDays: new Set(workouts.map((w) => w.local_date)).size,
    volumeKg: workouts.reduce((s, w) => s + strengthVolume(w.exercises ?? []), 0),
  };
}

/**
 * Exercise calories for the daily budget: logged workouts win; the health platform's active
 * calories are used only when nothing was logged (taking the max would double count rarely, but
 * summing would double count often).
 */
export function dailyExerciseKcal(loggedKcal: number, healthActiveKcal: number | null): number {
  return Math.round(loggedKcal > 0 ? loggedKcal : (healthActiveKcal ?? 0));
}
