import type { MealItem } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import { fontFamily, spacing, useTheme } from '@/theme';
import { formatGrams, formatKcal } from '@/utils/format';
import { mealTotals } from './mealMath';

/**
 * Live totals for the draft (always the sum of the items): kcal, a stacked bar with the share
 * of calories from each macro (P×4, C×4, G×9) and the grams.
 */
export function DraftTotals({ items }: { items: MealItem[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const totals = mealTotals(items);
  const parts = [
    { kcal: totals.protein_g * 4, color: colors.protein },
    { kcal: totals.carbs_g * 4, color: colors.carbs },
    { kcal: totals.fat_g * 9, color: colors.fat },
  ];
  const sum = parts.reduce((s, p) => s + p.kcal, 0);
  return (
    <Card
      style={styles.card}
      accessibilityLabel={t('review.totalsA11y', { kcal: Math.round(totals.kcal) })}
    >
      <View style={styles.main}>
        <AppText variant="label" color="textMuted">
          {t('review.total')}
        </AppText>
        <AppText style={styles.kcal} tabular testID="draft-total-kcal">
          {formatKcal(totals.kcal)}
          <AppText variant="caption" color="textMuted">
            {' '}
            kcal
          </AppText>
        </AppText>
      </View>
      <View style={styles.bar}>
        {sum > 0 ? (
          parts.map((p, i) => (
            <View
              key={i}
              style={{ flex: p.kcal / sum, backgroundColor: p.color, borderRadius: 3 }}
            />
          ))
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.surfaceAlt }]} />
        )}
      </View>
      <View style={styles.row}>
        <Macro label={t('macros.protein')} value={totals.protein_g} />
        <Macro label={t('macros.carbs')} value={totals.carbs_g} />
        <Macro label={t('macros.fat')} value={totals.fat_g} />
      </View>
    </Card>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <AppText variant="caption" color="textMuted">
      {label}{' '}
      <AppText variant="caption" color="text" style={styles.strong} tabular>
        {formatGrams(value)} g
      </AppText>
    </AppText>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  main: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  kcal: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  bar: { flexDirection: 'row', height: 6, gap: 3 },
  empty: { flex: 1, borderRadius: 3 },
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  strong: { fontFamily: fontFamily.extrabold },
});
