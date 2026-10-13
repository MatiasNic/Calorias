import { SUPPLEMENT_PRESETS } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip } from '@/components';
import { spacing } from '@/theme';
import type { SupplementPreset } from '../useSupplementForm';

/** Quick picks for popular supplements (fills name, unit and amount). */
export function PresetPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (p: SupplementPreset) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.group}>
      <AppText variant="caption" color="textMuted">
        {t('supplements.quickPicks')}
      </AppText>
      <View style={styles.wrap}>
        {SUPPLEMENT_PRESETS.map((p) => (
          <Chip
            key={p.key}
            label={t(`supplements.presets.${p.key}`)}
            selected={value === p.key}
            onPress={() => onPick(p)}
            testID={`preset-${p.key}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
});
