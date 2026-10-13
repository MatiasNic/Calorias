import { useTranslation } from 'react-i18next';

import { AppText, Button, SectionHeader } from '@/components';
import { formatLoad } from '../labels';
import type { WorkoutForm } from '../useWorkoutForm';
import { ExerciseCard } from './ExerciseCard';
import { ExercisePicker } from './ExercisePicker';

/**
 * Strength exercises of the workout editor. Shown for strength activities (or once something was
 * added); otherwise only a ghost button to start adding exercises.
 */
export function WorkoutExercises({ form }: { form: WorkoutForm }) {
  const { t } = useTranslation();
  if (!form.showExercises) {
    return (
      <Button
        label={t('training.addExercise')}
        variant="ghost"
        icon="barbell-outline"
        onPress={() => form.setPicking(true)}
      />
    );
  }
  return (
    <>
      <SectionHeader title={t('training.exercises')} />
      <AppText variant="caption" color="textMuted">
        {t('training.exercisesHint')}
      </AppText>
      {form.exercises.map((e, ei) => (
        <ExerciseCard
          key={`${e.key}-${ei}`}
          exercise={e}
          imperial={form.imperial}
          onRemove={() => form.removeExercise(ei)}
          onChangeSet={(si, patch) => form.updateSet(ei, si, patch)}
          onRemoveSet={(si) => form.removeSet(ei, si)}
          onAddSet={() => form.addSet(ei)}
        />
      ))}
      {form.picking ? (
        <ExercisePicker
          customName={form.customName}
          onChangeCustomName={form.setCustomName}
          onPick={form.addExercise}
        />
      ) : (
        <Button
          label={t('training.addExercise')}
          variant="secondary"
          icon="add"
          onPress={() => form.setPicking(true)}
          testID="workout-add-exercise"
        />
      )}
      {form.volume > 0 ? (
        <AppText variant="label" color="textMuted">
          {`${t('training.volume')}: ${formatLoad(form.volume, form.units)}`}
        </AppText>
      ) : null}
    </>
  );
}
