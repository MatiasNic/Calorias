import type { DailySummary } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, ProgressRing } from '@/components';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';

export function CaloriesCard({ summary, steps }: { summary: DailySummary; steps: number | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const over = summary.remainingKcal < 0;
  return (
    <Card style={styles.card}>
      <ProgressRing
        progress={summary.progress.kcal}
        size={200}
        strokeWidth={18}
        accessibilityLabel={t('today.ringA11y', {
          consumed: Math.round(summary.consumed.kcal),
          target: summary.target.kcal + summary.exerciseKcal,
        })}
      >
        <AppText variant="display" tabular testID="today-remaining">
          {formatKcal(Math.abs(summary.remainingKcal))}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {over ? t('today.overBy') : t('today.remaining')}
        </AppText>
      </ProgressRing>
      <View style={styles.stats}>
        <Stat
          icon="restaurant"
          color={colors.kcal}
          label={t('today.eaten')}
          value={formatKcal(summary.consumed.kcal)}
        />
        <Stat
          icon="flag"
          color={colors.textMuted}
          label={t('today.goal')}
          value={formatKcal(summary.target.kcal)}
        />
        <Stat
          icon="flame"
          color={colors.accent}
          label={t('today.exercise')}
          value={formatKcal(summary.exerciseKcal)}
        />
      </View>
      {steps != null ? (
        <AppText variant="caption" color="textMuted">
          {t('today.steps', { count: steps })}
        </AppText>
      ) : null}
    </Card>
  );
}

function Stat({
  icon,
  color,
  label,
  value,
}: {
  icon: 'restaurant' | 'flag' | 'flame';
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value} kcal`}>
      <Icon name={icon} size={18} rawColor={color} />
      <AppText variant="bodyStrong" tabular>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.lg },
  stats: { flexDirection: 'row', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
