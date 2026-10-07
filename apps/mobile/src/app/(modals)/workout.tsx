import {
  ACTIVITIES,
  STRENGTH_EXERCISES,
  WORKOUT_DEFAULTS,
  WORKOUT_INTENSITIES,
  WORKOUT_LIMITS,
  activityDef,
  kgToLb,
  kmToMi,
  lbToKg,
  miToKm,
  strengthVolume,
  workoutKcal,
  type ActivityKind,
  type IsoDate,
  type StrengthExercise,
  type WorkoutIntensity,
} from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Stepper,
  TextField,
  toast,
} from '@/components';
import { useLatestWeight } from '@/features/body/hooks';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { WeekStrip } from '@/features/diary/components/WeekStrip';
import { checkAchievements } from '@/features/habits/hooks';
import { deleteWorkout, lastSetsFor, saveWorkout, useWorkout } from '@/features/training/hooks';
import {
  activityIcon,
  activityName,
  customExerciseKey,
  exerciseName,
  formatLoad,
} from '@/features/training/labels';
import type { WorkoutRecord } from '@/services/db/types';
import { usePrefsStore } from '@/stores/prefs';
import { radii, spacing, useTheme } from '@/theme';
import { timestampFor, todayLocal } from '@/utils/dates';
import { formatKcal, formatNumber, parseDecimal } from '@/utils/format';

const KINDS: ActivityKind[] = ['cardio', 'strength', 'sport', 'mind', 'other'];
const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface SetDraft {
  reps: string;
  load: string;
}
interface ExerciseDraft {
  key: string;
  sets: SetDraft[];
}

export default function WorkoutModal() {
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const existing = useWorkout(params.id);
  // Wait for the workout being edited so the form starts from its values.
  if (params.id && !existing.data) return null;
  return (
    <WorkoutForm
      initial={existing.data ?? null}
      initialDate={(params.date as IsoDate | undefined) ?? todayLocal()}
    />
  );
}

function WorkoutForm({
  initial,
  initialDate,
}: {
  initial: WorkoutRecord | null;
  initialDate: IsoDate;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
      m: initial ? at.getMinutes() : Math.floor(at.getMinutes() / 15) * 15,
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
  const kcal = Math.min(WORKOUT_LIMITS.maxKcal, Math.max(0, Math.round(manual ?? estimate)));
  const showExercises = def.kind === 'strength' || exercises.length > 0 || picking;

  const toKg = (text: string) => {
    const v = parseDecimal(text);
    if (v == null || v < 0) return 0;
    return Math.min(WORKOUT_LIMITS.maxKg, Math.round((imperial ? lbToKg(v) : v) * 10) / 10);
  };
  const parsedExercises: StrengthExercise[] = exercises
    .map((e) => ({
      key: e.key,
      sets: e.sets
        .map((s) => ({ reps: Math.round(parseDecimal(s.reps) ?? 0), kg: toKg(s.load) }))
        .filter((s) => s.reps > 0),
    }))
    .filter((e) => e.sets.length > 0);
  const volume = strengthVolume(parsedExercises);

  const addExercise = async (key: string) => {
    setPicking(false);
    setCustomName('');
    const last = await lastSetsFor(key);
    const sets = last?.length
      ? last.map((x) => ({ reps: String(x.reps), load: loadText(x.kg) }))
      : [{ reps: '', load: '' }];
    setExercises((xs) => [...xs, { key, sets }]);
  };

  const updateSet = (ei: number, si: number, patch: Partial<SetDraft>) =>
    setExercises((xs) =>
      xs.map((e, i) =>
        i === ei ? { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : e,
      ),
    );

  const save = async () => {
    const dist = parseDecimal(distance);
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
      distance_km:
        def.distance && dist != null && dist > 0
          ? Math.round((imperial ? miToKm(dist) : dist) * 100) / 100
          : null,
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

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('common.save')}
          onPress={save}
          disabled={minutes <= 0}
          testID="workout-save"
        />
      }
    >
      <ScreenHeader
        close
        title={initial ? t('training.editTitle') : t('training.newTitle')}
        right={
          initial ? (
            <IconButton
              icon="trash-outline"
              color="textMuted"
              accessibilityLabel={t('common.delete')}
              onPress={remove}
            />
          ) : undefined
        }
      />

      <SectionHeader title={t('training.activity')} />
      <Card
        onPress={() => setPickActivity((v) => !v)}
        accessibilityLabel={`${t('training.activity')}: ${activityName(activity)}`}
        style={styles.activityCard}
      >
        <View style={[styles.activityIcon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={activityIcon(activity)} size={22} />
        </View>
        <AppText variant="subheading" style={styles.flex}>
          {activityName(activity)}
        </AppText>
        <Icon name={pickActivity ? 'chevron-up' : 'chevron-down'} color="textMuted" size={18} />
      </Card>
      {pickActivity
        ? KINDS.map((kind) => (
            <View key={kind} style={styles.group}>
              <AppText variant="overline" color="textMuted">
                {t(`training.kinds.${kind}`).toUpperCase()}
              </AppText>
              <View style={styles.wrap}>
                {ACTIVITIES.filter((a) => a.kind === kind).map((a) => (
                  <Chip
                    key={a.key}
                    label={activityName(a.key)}
                    icon={activityIcon(a.key)}
                    selected={a.key === activity}
                    testID={`activity-${a.key}`}
                    onPress={() => {
                      setActivity(a.key);
                      setPickActivity(false);
                    }}
                  />
                ))}
              </View>
            </View>
          ))
        : null}

      <TextField
        label={t('training.customTitle')}
        placeholder={t('training.customTitlePlaceholder')}
        value={title}
        onChangeText={setTitle}
        maxLength={60}
      />

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          {t('training.duration')}
        </AppText>
        <Stepper
          label={t('training.duration')}
          value={minutes}
          onChange={setMinutes}
          step={WORKOUT_DEFAULTS.minutesStep}
          min={WORKOUT_DEFAULTS.minutesStep}
          max={WORKOUT_LIMITS.maxMinutes}
          unit="min"
        />
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          {t('training.intensity')}
        </AppText>
        <SegmentedControl
          accessibilityLabel={t('training.intensity')}
          value={intensity}
          onChange={setIntensity}
          options={WORKOUT_INTENSITIES.map((v) => ({
            value: v,
            label: t(`training.intensities.${v}`),
          }))}
        />
      </View>

      {def.distance ? (
        <TextField
          label={t('training.distance')}
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          suffix={imperial ? 'mi' : 'km'}
          maxLength={6}
        />
      ) : null}

      <View style={styles.group}>
        <TextField
          label={t('training.kcal')}
          value={manualKcal ?? String(estimate)}
          onChangeText={(v) => setManualKcal(v)}
          keyboardType="number-pad"
          suffix="kcal"
          maxLength={4}
          testID="workout-kcal"
          hint={
            manual != null
              ? t('training.kcalManual')
              : weight.data
                ? t('training.kcalEstimated', { weight: formatLoad(weight.data, units) })
                : t('training.kcalNoWeight')
          }
        />
        {manualKcal != null ? (
          <Button
            label={t('training.useEstimate')}
            variant="ghost"
            size="sm"
            icon="refresh"
            fullWidth={false}
            onPress={() => setManualKcal(null)}
          />
        ) : null}
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          {t('training.when')}
        </AppText>
        <WeekStrip value={date} onChange={setDate} />
        <TimeStepper value={time} onChange={setTime} />
      </View>

      {showExercises ? (
        <>
          <SectionHeader title={t('training.exercises')} />
          <AppText variant="caption" color="textMuted">
            {t('training.exercisesHint')}
          </AppText>
          {exercises.map((e, ei) => (
            <Card key={`${e.key}-${ei}`} style={styles.exercise}>
              <View style={styles.row}>
                <AppText variant="subheading" style={styles.flex}>
                  {exerciseName(e.key)}
                </AppText>
                <IconButton
                  icon="close"
                  size={18}
                  color="textMuted"
                  accessibilityLabel={t('training.removeExercise', { name: exerciseName(e.key) })}
                  onPress={() => setExercises((xs) => xs.filter((_, i) => i !== ei))}
                />
              </View>
              <View style={styles.row}>
                <View style={styles.setLabel} />
                <AppText variant="caption" color="textMuted" style={styles.flex}>
                  {t('training.reps')}
                </AppText>
                <AppText variant="caption" color="textMuted" style={styles.flex}>
                  {imperial ? 'lb' : 'kg'}
                </AppText>
                <View style={styles.setAction} />
              </View>
              {e.sets.map((s, si) => (
                <View key={si} style={styles.row}>
                  <AppText variant="label" color="textMuted" style={styles.setLabel}>
                    {t('training.set', { n: si + 1 })}
                  </AppText>
                  <View style={styles.flex}>
                    <TextField
                      value={s.reps}
                      onChangeText={(v) => updateSet(ei, si, { reps: v })}
                      keyboardType="number-pad"
                      maxLength={3}
                      accessibilityLabel={`${t('training.set', { n: si + 1 })} ${t('training.reps')}`}
                    />
                  </View>
                  <View style={styles.flex}>
                    <TextField
                      value={s.load}
                      onChangeText={(v) => updateSet(ei, si, { load: v })}
                      keyboardType="decimal-pad"
                      maxLength={6}
                      accessibilityLabel={`${t('training.set', { n: si + 1 })} ${imperial ? 'lb' : 'kg'}`}
                    />
                  </View>
                  <IconButton
                    icon="remove-circle-outline"
                    size={20}
                    color="textMuted"
                    disabled={e.sets.length <= 1}
                    accessibilityLabel={t('training.removeSet', { n: si + 1 })}
                    onPress={() =>
                      setExercises((xs) =>
                        xs.map((x, i) =>
                          i === ei ? { ...x, sets: x.sets.filter((_, j) => j !== si) } : x,
                        ),
                      )
                    }
                  />
                </View>
              ))}
              <Button
                label={t('training.addSet')}
                variant="ghost"
                size="sm"
                icon="add"
                fullWidth={false}
                disabled={e.sets.length >= WORKOUT_LIMITS.maxSets}
                onPress={() =>
                  setExercises((xs) =>
                    xs.map((x, i) =>
                      i === ei
                        ? {
                            ...x,
                            sets: [
                              ...x.sets,
                              { ...(x.sets[x.sets.length - 1] ?? { reps: '', load: '' }) },
                            ],
                          }
                        : x,
                    ),
                  )
                }
              />
            </Card>
          ))}
          {picking ? (
            <Card style={styles.exercise}>
              <AppText variant="label" color="textMuted">
                {t('training.pickExercise')}
              </AppText>
              <View style={styles.wrap}>
                {STRENGTH_EXERCISES.map((key) => (
                  <Chip key={key} label={exerciseName(key)} onPress={() => addExercise(key)} />
                ))}
              </View>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <TextField
                    label={t('training.customExercise')}
                    placeholder={t('training.customExercisePlaceholder')}
                    value={customName}
                    onChangeText={setCustomName}
                    maxLength={40}
                    onSubmitEditing={() =>
                      customName.trim() && addExercise(customExerciseKey(customName))
                    }
                  />
                </View>
                <IconButton
                  icon="add"
                  background="surfaceAlt"
                  square
                  disabled={!customName.trim()}
                  accessibilityLabel={t('training.addExercise')}
                  onPress={() => addExercise(customExerciseKey(customName))}
                />
              </View>
            </Card>
          ) : (
            <Button
              label={t('training.addExercise')}
              variant="secondary"
              icon="add"
              onPress={() => setPicking(true)}
              testID="workout-add-exercise"
            />
          )}
          {volume > 0 ? (
            <AppText variant="label" color="textMuted">
              {`${t('training.volume')}: ${formatLoad(volume, units)}`}
            </AppText>
          ) : null}
        </>
      ) : (
        <Button
          label={t('training.addExercise')}
          variant="ghost"
          icon="barbell-outline"
          onPress={() => setPicking(true)}
        />
      )}

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          {t('training.rpe')}
        </AppText>
        <View style={styles.wrap}>
          {RPE.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={rpe === n}
              onPress={() => setRpe(rpe === n ? null : n)}
            />
          ))}
        </View>
        <AppText variant="caption" color="textMuted">
          {t('training.rpeHint')}
        </AppText>
      </View>

      <TextField
        label={t('training.note')}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
      />

      <View style={[styles.summary, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name="flame-outline" color="kcal" size={20} />
        <AppText variant="bodyStrong" tabular>
          {`${formatKcal(kcal)} kcal · ${minutes} min`}
        </AppText>
      </View>
      <AppText variant="caption" color="textSubtle">
        {t('training.disclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercise: { gap: spacing.sm },
  setLabel: { width: 56 },
  setAction: { width: 48 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
});
