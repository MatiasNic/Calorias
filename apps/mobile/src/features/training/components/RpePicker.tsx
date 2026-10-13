import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip } from '@/components';
import { spacing } from '@/theme';

const RPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Optional perceived exertion (1–10); tapping the selected value clears it. */
export function RpePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.group}>
      <AppText variant="label" color="textMuted">
        {t('training.rpe')}
      </AppText>
      <View style={styles.wrap}>
        {RPE.map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={value === n}
            onPress={() => onChange(value === n ? null : n)}
          />
        ))}
      </View>
      <AppText variant="caption" color="textMuted">
        {t('training.rpeHint')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
});
