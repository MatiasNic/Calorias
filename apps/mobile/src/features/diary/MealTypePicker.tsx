import { MEAL_TYPE_ORDER, type MealType } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components';
import { spacing } from '@/theme';

export function MealTypePicker({
  value,
  onChange,
}: {
  value: MealType;
  onChange: (m: MealType) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('diary.mealType')}
    >
      {MEAL_TYPE_ORDER.map((m) => (
        <Chip
          key={m}
          label={t(`mealTypes.${m}`)}
          selected={value === m}
          onPress={() => onChange(m)}
          testID={`meal-type-${m}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
