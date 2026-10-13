import {
  WORKOUT_DEFAULTS,
  activityDef,
  compactStrengthExercises,
  distanceInputToKm,
  floorToTimeStep,
  kgToLb,
  kmToMi,
  loadInputToKg,
  strengthVolume,
  workoutKcal,
  workoutKcalToSave,
  type IsoDate,
  type WorkoutIntensity,
} from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { useLatestWeight } from '@/features/body/hooks';
import { checkAchievements } from '@/features/habits/hooks';
import type { WorkoutRecord } from '@/services/db/types';
import { usePrefsStore } from '@/stores/prefs';
import { timestampFor } from '@/utils/dates';
import { formatNumber, parseDecimal } from '@/utils/format';
import { deleteWorkout, lastSetsFor, saveWorkout } from './hooks';

/** A strength set as typed in the form (load in the user's unit). */
export interface SetDraft {
  reps: string;
  load: string;
}

export interface ExerciseDraft {
  key: string;
  sets: SetDraft[];
}

const EMPTY_SET: SetDraft = { reps: '', load: '' };

/** State, derived values and actions of the workout editor. */
export function useWorkoutForm(initial: WorkoutRecord | null, initialDate: IsoDate) {
  const { t } = useTranslation();
  const units = usePrefsStore((s) => s.units);
  const imperial = units === 'imperial';
  const weight = useLatestWeight();
  const loadText = (kg: number) => (kg ? formatNumber(imperial ? kgToLb(kg) : kg, 1) : '');

  const [activity, setActivity] = useState(initial?.activity ?? 'strength');
  const [pickActivity, setPickActivity] = useState(!initial);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [minutes, setMinutes] = useState<number>(initial?.duration_min ?? WORKOUT_DEFAULTS.minutes);
  const [intensity, setIntensity] = useState<WorkoutIntensity>(initial?.intensity ?? 'moderate');
  const [manualKcal, setManualKcal] = useState<string | null>(
    initial?.kcal_source === 'manual' ? String(initial.kcal) : null,
  );
  const [distance, setDistance] = useState(
    initial?.distance_km != null
      ? formatNumber(imperial ? kmToMi(initial.distance_km) : initial.distance_km, 2)
      : '',
  );
  const [date, setDate] = useState<IsoDate>((initial?.local_date as IsoDate) ?? initialDate);
  const [time, setTime] = useState(() => {
    const at = initial ? new Date(initial.started_at) : new Date();
    return {
      h: at.getHours(),
      m: initial ? at.getMinutes() : floorToTimeStep(at.getMinutes()),
    };
  });
  const [rpe, setRpe] = useState<number | null>(initial?.rpe ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    () =>
      initial?.exercises.map((e) => ({
        key: e.key,
        sets: e.sets.map((x) => ({ reps: String(x.reps), load: loadText(x.kg) })),
      })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [customName, setCustomName] = useState('');

  const def = activityDef(activity);
  const weightKg = weight.data ?? WORKOUT_DEFAULTS.weightKg;
  const estimate = workoutKcal(activity, intensity, minutes, weightKg);
  const manual = manualKcal != null ? parseDecimal(manualKcal) : null;
  const kcal = workoutKcalToSave(manual, estimate);
  const showExercises = def.kind === 'strength' || exercises.length > 0 || picking;

  const parsedExercises = compactStrengthExercises(
    exercises.map((e) => ({
      key: e.key,
      sets: e.sets.map((s) => ({
        reps: parseDecimal(s.reps),
        kg: loadInputToKg(parseDecimal(s.load), imperial),
      })),
    })),
  );
  const volume = strengthVolume(parsedExercises);

  const mapExercise = (ei: number, fn: (e: ExerciseDraft) => ExerciseDraft) =>
    setExercises((xs) => xs.map((e, i) => (i === ei ? fn(e) : e)));

  const addExercise = async (key: string) => {
    setPicking(false);
    setCustomName('');
    const last = await lastSetsFor(key);
    const sets = last?.length
      ? last.map((x) => ({ reps: String(x.reps), load: loadText(x.kg) }))
      : [{ ...EMPTY_SET }];
    setExercises((xs) => [...xs, { key, sets }]);
  };

  const removeExercise = (ei: number) => setExercises((xs) => xs.filter((_, i) => i !== ei));

  const updateSet = (ei: number, si: number, patch: Partial<SetDraft>) =>
    mapExercise(ei, (e) => ({
      ...e,
      sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)),
    }));

  const removeSet = (ei: number, si: number) =>
    mapExercise(ei, (e) => ({ ...e, sets: e.sets.filter((_, j) => j !== si) }));

  /** Adds a set copying the previous one (the usual "same again"). */
  const addSet = (ei: number) =>
    mapExercise(ei, (e) => ({
      ...e,
      sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? EMPTY_SET) }],
    }));

  const save = async () => {
    await saveWorkout({
      id: initial?.id,
      started_at: timestampFor(date, time),
      local_date: date,
      activity,
      title: title.trim() || null,
      duration_min: minutes,
      intensity,
      kcal,
      kcal_source: manual != null ? 'manual' : 'estimated',
      distance_km: def.distance ? distanceInputToKm(parseDecimal(distance), imperial) : null,
      exercises: parsedExercises,
      rpe,
      note: note.trim() || null,
    });
    checkAchievements().catch(() => undefined);
    toast.success(t('training.saved'));
    router.back();
  };

  const remove = () =>
    Alert.alert(t('training.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (initial) await deleteWorkout(initial.id);
          router.back();
        },
      },
    ]);

  return {
    units,
    imperial,
    weightKg: weight.data,
    activity,
    setActivity,
    pickActivity,
    setPickActivity,
    title,
    setTitle,
    minutes,
    setMinutes,
    intensity,
    setIntensity,
    manualKcal,
    setManualKcal,
    manual,
    estimate,
    kcal,
    distance,
    setDistance,
    hasDistance: !!def.distance,
    date,
    setDate,
    time,
    setTime,
    rpe,
    setRpe,
    note,
    setNote,
    exercises,
    showExercises,
    volume,
    picking,
    setPicking,
    customName,
    setCustomName,
    addExercise,
    removeExercise,
    updateSet,
    removeSet,
    addSet,
    save,
    remove,
  };
}

export type WorkoutForm = ReturnType<typeof useWorkoutForm>;
