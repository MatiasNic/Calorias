import {
  WORKOUT_DEFAULTS,
  WORKOUT_INTENSITIES,
  WORKOUT_LIMITS,
  type IsoDate,
} from '@bocado/shared';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Icon,
  IconButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Stepper,
  TextField,
} from '@/components';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { WeekStrip } from '@/features/diary/components/WeekStrip';
import { ActivityPicker } from '@/features/training/components/ActivityPicker';
import { RpePicker } from '@/features/training/components/RpePicker';
import { WorkoutExercises } from '@/features/training/components/WorkoutExercises';
import { useWorkout } from '@/features/training/hooks';
import { formatLoad } from '@/features/training/labels';
import { useWorkoutForm } from '@/features/training/useWorkoutForm';
import type { WorkoutRecord } from '@/services/db/types';
import { radii, spacing, useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

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
  const form = useWorkoutForm(initial, initialDate);

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('common.save')}
          onPress={form.save}
          disabled={form.minutes <= 0}
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
              onPress={form.remove}
            />
          ) : undefined
        }
      />

      <ActivityPicker
        value={form.activity}
        open={form.pickActivity}
        onToggle={() => form.setPickActivity((v) => !v)}
        onChange={(key) => {
          form.setActivity(key);
          form.setPickActivity(false);
        }}
      />

      <TextField
        label={t('training.customTitle')}
        placeholder={t('training.customTitlePlaceholder')}
        value={form.title}
        onChangeText={form.setTitle}
        maxLength={60}
      />

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          {t('training.duration')}
        </AppText>
        <Stepper
          label={t('training.duration')}
          value={form.minutes}
          onChange={form.setMinutes}
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
          value={form.intensity}
          onChange={form.setIntensity}
          options={WORKOUT_INTENSITIES.map((v) => ({
            value: v,
            label: t(`training.intensities.${v}`),
          }))}
        />
      </View>

      {form.hasDistance ? (
        <TextField
          label={t('training.distance')}
          value={form.distance}
          onChangeText={form.setDistance}
          keyboardType="decimal-pad"
          suffix={form.imperial ? 'mi' : 'km'}
          maxLength={6}
        />
      ) : null}

      <View style={styles.group}>
        <TextField
          label={t('training.kcal')}
          value={form.manualKcal ?? String(form.estimate)}
          onChangeText={(v) => form.setManualKcal(v)}
          keyboardType="number-pad"
          suffix="kcal"
          maxLength={4}
          testID="workout-kcal"
          hint={
            form.manual != null
              ? t('training.kcalManual')
              : form.weightKg
                ? t('training.kcalEstimated', { weight: formatLoad(form.weightKg, form.units) })
                : t('training.kcalNoWeight')
          }
        />
        {form.manualKcal != null ? (
          <Button
            label={t('training.useEstimate')}
            variant="ghost"
            size="sm"
            icon="refresh"
            fullWidth={false}
            onPress={() => form.setManualKcal(null)}
          />
        ) : null}
      </View>

      <View style={styles.group}>
        <AppText variant="label" color="textMuted">
          {t('training.when')}
        </AppText>
        <WeekStrip value={form.date} onChange={form.setDate} />
        <TimeStepper value={form.time} onChange={form.setTime} />
      </View>

      <WorkoutExercises form={form} />

      <RpePicker value={form.rpe} onChange={form.setRpe} />

      <TextField
        label={t('training.note')}
        value={form.note}
        onChangeText={form.setNote}
        multiline
        maxLength={500}
      />

      <View style={[styles.summary, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name="flame-outline" color="kcal" size={20} />
        <AppText variant="bodyStrong" tabular>
          {`${formatKcal(form.kcal)} kcal · ${form.minutes} min`}
        </AppText>
      </View>
      <AppText variant="caption" color="textSubtle">
        {t('training.disclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
});
