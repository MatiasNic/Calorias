import type { DailySummary } from '@bocado/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, ProgressBar } from '@/components';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';

/** Today's hero: the kcal left as the one big number on the screen, with a thin progress bar. */
export function CaloriesCard({ summary, steps }: { summary: DailySummary; steps: number | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const over = summary.remainingKcal < 0;
  const target = summary.target.kcal + summary.exerciseKcal;
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={t('today.ringA11y', {
        consumed: Math.round(summary.consumed.kcal),
        target,
      })}
    >
      <AppText variant="label" color="textMuted">
        {over ? t('today.overLabel') : t('today.leftLabel')}
      </AppText>
      <View style={styles.hero}>
        <AppText variant="numberHero" testID="today-remaining">
          {formatKcal(Math.abs(summary.remainingKcal))}
        </AppText>
        <AppText variant="heading" color="textMuted" style={styles.unit}>
          kcal
        </AppText>
      </View>
      <ProgressBar
        progress={Math.min(1, summary.progress.kcal)}
        // Going over is information, not an alarm: same calm color.
        color={colors.kcal}
        height={10}
      />
      <View style={styles.footer}>
        <AppText variant="caption" color="textMuted" style={styles.flex} numberOfLines={1}>
          {summary.exerciseKcal > 0
            ? t('today.consumedWithExercise', {
                consumed: formatKcal(summary.consumed.kcal),
                exercise: formatKcal(summary.exerciseKcal),
              })
            : t('today.consumedLine', { consumed: formatKcal(summary.consumed.kcal) })}
          {steps != null ? ` · ${t('today.steps', { count: steps })}` : ''}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {t('today.goalLine', { goal: formatKcal(summary.target.kcal) })}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  unit: { marginBottom: spacing.sm, fontSize: 20 },
  footer: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
