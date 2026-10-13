import { WORKOUT_LIMITS } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, IconButton, TextField } from '@/components';
import { spacing } from '@/theme';
import { exerciseName } from '../labels';
import type { ExerciseDraft, SetDraft } from '../useWorkoutForm';

/** One strength exercise in the workout editor: its sets (reps × load) as editable rows. */
export function ExerciseCard({
  exercise,
  imperial,
  onRemove,
  onChangeSet,
  onRemoveSet,
  onAddSet,
}: {
  exercise: ExerciseDraft;
  imperial: boolean;
  onRemove: () => void;
  onChangeSet: (si: number, patch: Partial<SetDraft>) => void;
  onRemoveSet: (si: number) => void;
  onAddSet: () => void;
}) {
  const { t } = useTranslation();
  const unit = imperial ? 'lb' : 'kg';
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <AppText variant="subheading" style={styles.flex}>
          {exerciseName(exercise.key)}
        </AppText>
        <IconButton
          icon="close"
          size={18}
          color="textMuted"
          accessibilityLabel={t('training.removeExercise', { name: exerciseName(exercise.key) })}
          onPress={onRemove}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.setLabel} />
        <AppText variant="caption" color="textMuted" style={styles.flex}>
          {t('training.reps')}
        </AppText>
        <AppText variant="caption" color="textMuted" style={styles.flex}>
          {unit}
        </AppText>
        <View style={styles.setAction} />
      </View>
      {exercise.sets.map((s, si) => (
        <View key={si} style={styles.row}>
          <AppText variant="label" color="textMuted" style={styles.setLabel}>
            {t('training.set', { n: si + 1 })}
          </AppText>
          <View style={styles.flex}>
            <TextField
              value={s.reps}
              onChangeText={(v) => onChangeSet(si, { reps: v })}
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel={`${t('training.set', { n: si + 1 })} ${t('training.reps')}`}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              value={s.load}
              onChangeText={(v) => onChangeSet(si, { load: v })}
              keyboardType="decimal-pad"
              maxLength={6}
              accessibilityLabel={`${t('training.set', { n: si + 1 })} ${unit}`}
            />
          </View>
          <IconButton
            icon="remove-circle-outline"
            size={20}
            color="textMuted"
            disabled={exercise.sets.length <= 1}
            accessibilityLabel={t('training.removeSet', { n: si + 1 })}
            onPress={() => onRemoveSet(si)}
          />
        </View>
      ))}
      <Button
        label={t('training.addSet')}
        variant="ghost"
        size="sm"
        icon="add"
        fullWidth={false}
        disabled={exercise.sets.length >= WORKOUT_LIMITS.maxSets}
        onPress={onAddSet}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  card: { gap: spacing.sm },
  setLabel: { width: 56 },
  setAction: { width: 48 },
});
