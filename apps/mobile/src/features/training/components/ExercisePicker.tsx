import { STRENGTH_EXERCISES } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Chip, IconButton, TextField } from '@/components';
import { spacing } from '@/theme';
import { customExerciseKey, exerciseName } from '../labels';

/** Catalog of strength exercises plus a free-text field for custom ones. */
export function ExercisePicker({
  customName,
  onChangeCustomName,
  onPick,
}: {
  customName: string;
  onChangeCustomName: (v: string) => void;
  onPick: (key: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <AppText variant="label" color="textMuted">
        {t('training.pickExercise')}
      </AppText>
      <View style={styles.wrap}>
        {STRENGTH_EXERCISES.map((key) => (
          <Chip key={key} label={exerciseName(key)} onPress={() => onPick(key)} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={t('training.customExercise')}
            placeholder={t('training.customExercisePlaceholder')}
            value={customName}
            onChangeText={onChangeCustomName}
            maxLength={40}
            onSubmitEditing={() => customName.trim() && onPick(customExerciseKey(customName))}
          />
        </View>
        <IconButton
          icon="add"
          background="surfaceAlt"
          square
          disabled={!customName.trim()}
          accessibilityLabel={t('training.addExercise')}
          onPress={() => onPick(customExerciseKey(customName))}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { gap: spacing.sm },
});
