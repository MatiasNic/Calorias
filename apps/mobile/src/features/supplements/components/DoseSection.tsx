import { SUPPLEMENT_UNITS } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, SectionHeader, TextField } from '@/components';
import { spacing } from '@/theme';
import type { SupplementForm } from '../useSupplementForm';

/** Dose amount and unit. */
export function DoseSection({ form }: { form: SupplementForm }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionHeader title={t('supplements.dose')} />
      <TextField
        value={form.amount}
        onChangeText={form.setAmount}
        keyboardType="decimal-pad"
        maxLength={7}
        accessibilityLabel={t('supplements.dose')}
        suffix={t(`supplements.units.${form.unit}`, { count: form.dose ?? 1 })}
      />
      <View style={styles.wrap}>
        {SUPPLEMENT_UNITS.map((u) => (
          <Chip
            key={u}
            label={t(`supplements.units.${u}`, { count: 1 })}
            selected={form.unit === u}
            onPress={() => form.setUnit(u)}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
