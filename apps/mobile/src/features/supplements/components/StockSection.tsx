import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, SectionHeader, TextField } from '@/components';
import { spacing } from '@/theme';
import type { SupplementForm } from '../useSupplementForm';

/** Doses left and the low-stock threshold (both optional). */
export function StockSection({ form }: { form: SupplementForm }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionHeader title={t('supplements.stock')} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={t('supplements.stock')}
            placeholder={t('supplements.stockPlaceholder')}
            value={form.stock}
            onChangeText={form.setStock}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label={t('supplements.lowThreshold')}
            placeholder="5"
            value={form.threshold}
            onChangeText={form.setThreshold}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      <AppText variant="caption" color="textMuted">
        {t('supplements.stockHint')}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
