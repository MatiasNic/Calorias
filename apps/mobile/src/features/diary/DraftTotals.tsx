import type { MealItem } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import { spacing, useTheme } from '@/theme';
import { formatGrams, formatKcal } from '@/utils/format';
import { mealTotals } from './mealMath';

/** Live totals for the draft (always equal to the sum of the items). */
export function DraftTotals({ items }: { items: MealItem[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const totals = mealTotals(items);
  return (
    <Card
      style={styles.card}
      accessibilityLabel={t('review.totalsA11y', { kcal: Math.round(totals.kcal) })}
    >
      <View style={styles.main}>
        <AppText variant="label" color="textMuted">
          {t('review.total')}
        </AppText>
        <AppText variant="title" tabular testID="draft-total-kcal">
          {formatKcal(totals.kcal)} kcal
        </AppText>
      </View>
      <View style={styles.row}>
        <Macro label={t('macros.protein')} value={totals.protein_g} color={colors.protein} />
        <Macro label={t('macros.carbs')} value={totals.carbs_g} color={colors.carbs} />
        <Macro label={t('macros.fat')} value={totals.fat_g} color={colors.fat} />
      </View>
    </Card>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular>
        {formatGrams(value)} g
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  main: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: spacing.md },
  macro: { flex: 1, gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
