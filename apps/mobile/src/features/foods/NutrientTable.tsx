import type { Nutrients } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components';
import { spacing, useTheme } from '@/theme';
import { formatGrams, formatKcal } from '@/utils/format';

export function NutrientTable({ n }: { n: Nutrients }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rows: [string, string, string?][] = [
    [t('common.kcal'), formatKcal(n.kcal)],
    [t('macros.protein'), `${formatGrams(n.protein_g)} g`, colors.protein],
    [t('macros.carbs'), `${formatGrams(n.carbs_g)} g`, colors.carbs],
    [t('macros.fat'), `${formatGrams(n.fat_g)} g`, colors.fat],
  ];
  if (n.fiber_g != null)
    rows.push([t('macros.fiber'), `${formatGrams(n.fiber_g)} g`, colors.fiber]);
  if (n.sugar_g != null) rows.push([t('macros.sugar'), `${formatGrams(n.sugar_g)} g`]);
  if (n.sat_fat_g != null) rows.push([t('macros.satFat'), `${formatGrams(n.sat_fat_g)} g`]);
  if (n.sodium_mg != null) rows.push([t('macros.sodium'), `${formatKcal(n.sodium_mg)} mg`]);
  return (
    <View>
      {rows.map(([label, value, color]) => (
        <View key={label} style={[styles.row, { borderBottomColor: colors.border }]}>
          {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
          <AppText style={styles.flex}>{label}</AppText>
          <AppText variant="bodyStrong" tabular>
            {value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
});
