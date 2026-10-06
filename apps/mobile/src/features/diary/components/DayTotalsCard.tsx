import type { DailySummary } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ProgressBar } from '@/components';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';

/** A past/selected day at a glance: what was eaten vs the goal, and the macro totals. */
export function DayTotalsCard({ summary }: { summary: DailySummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const consumed = summary.consumed.kcal;
  const target = summary.target.kcal + summary.exerciseKcal;
  const diff = Math.round(consumed - target);
  const over = diff > 0;
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textMuted">
        {t('diary.consumed')}
      </AppText>
      <View style={styles.hero}>
        <AppText variant="numberHero">{formatKcal(consumed)}</AppText>
        <AppText variant="bodyStrong" color="textMuted" style={styles.unit}>
          / {formatKcal(target)} kcal
        </AppText>
      </View>
      <ProgressBar
        progress={target > 0 ? Math.min(1, consumed / target) : 0}
        color={over ? colors.warning : colors.kcal}
        height={8}
      />
      <AppText variant="caption" style={{ color: over ? colors.warning : colors.textMuted }}>
        {over
          ? t('diary.overGoal', { kcal: formatKcal(diff) })
          : t('diary.underGoal', { kcal: formatKcal(-diff) })}
      </AppText>
      <Card style={styles.macros}>
        {(
          [
            ['protein', summary.consumed.protein_g, colors.protein],
            ['carbs', summary.consumed.carbs_g, colors.carbs],
            ['fat', summary.consumed.fat_g, colors.fat],
          ] as const
        ).map(([key, grams, color]) => (
          <View key={key} style={styles.macro}>
            <AppText variant="number" tabular style={{ color }}>
              {Math.round(grams)} g
            </AppText>
            <AppText variant="caption" color="textMuted">
              {t(`macros.${key}`).toLowerCase()}
            </AppText>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  unit: { marginBottom: spacing.sm },
  macros: { flexDirection: 'row', marginTop: spacing.xs },
  macro: { flex: 1, alignItems: 'center', gap: 2 },
});
