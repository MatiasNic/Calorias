import { kgToLb, projectGoalDate } from '@bocado/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card, EmptyState } from '@/components';
import { LineChart } from '@/components/charts';
import { usePrefsStore } from '@/stores/prefs';
import { spacing, useTheme } from '@/theme';
import { formatDay } from '@/utils/dates';
import { formatNumber, formatWeight } from '@/utils/format';

import type { ProgressData } from './types';

/** Weight trend chart with the goal line, weekly rate and projected goal date. */
export function WeightTrendCard({
  data,
  target,
}: {
  data: ProgressData;
  /** Target weight in kg, if the user set one. */
  target: number | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = usePrefsStore((s) => s.units);
  const w = (kg: number) => (units === 'imperial' ? kgToLb(kg) : kg);
  const lastTrend = data.trend[data.trend.length - 1];
  const projection =
    lastTrend && target && data.rate
      ? projectGoalDate(lastTrend.trendKg, target, data.rate, new Date())
      : null;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <AppText variant="subheading" style={styles.flex}>
          {t('progress.weight')}
        </AppText>
        <AppText variant="label" color="primary" onPress={() => router.push('/weight')}>
          {t('today.logWeight')}
        </AppText>
      </View>
      {data.trend.length ? (
        <>
          <AppText variant="number" tabular>
            {formatWeight(lastTrend!.trendKg, units).value}{' '}
            {formatWeight(lastTrend!.trendKg, units).unit}
            <AppText variant="caption" color="textMuted">{`  ${t('progress.trend')}`}</AppText>
          </AppText>
          <LineChart
            accessibilityLabel={t('progress.weightA11y', {
              last: formatNumber(w(data.trend[data.trend.length - 1]!.weightKg), 1),
              trend: formatNumber(w(lastTrend!.trendKg), 1),
            })}
            series={[
              {
                points: data.trend.map((p, i) => ({ x: i, y: w(p.weightKg) })),
                color: colors.textSubtle,
                showDots: true,
                width: 0.01,
              },
              {
                points: data.trend.map((p, i) => ({ x: i, y: w(p.trendKg) })),
                color: colors.text,
              },
            ]}
            reference={
              target
                ? { y: w(target), color: colors.textSubtle, label: t('progress.goal') }
                : undefined
            }
            yFormat={(v) => formatNumber(v, 0)}
            xLabels={[0, data.trend.length - 1]
              .filter((i, idx, a) => a.indexOf(i) === idx)
              .map((i) => ({
                x: i,
                label: formatDay(data.trend[i]!.date, { day: 'numeric', month: 'short' }),
              }))}
          />
          {data.rate != null ? (
            <AppText variant="caption" color="textMuted">
              {t('progress.rate', {
                rate: formatNumber(w(data.rate), 2),
                unit: units === 'imperial' ? 'lb' : 'kg',
              })}
            </AppText>
          ) : null}
          {projection ? (
            <Banner
              tone="info"
              message={t('progress.projection', {
                date: formatDay(projection, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              })}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="scale"
          title={t('progress.noWeights')}
          actionLabel={t('today.logWeight')}
          onAction={() => router.push('/weight')}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
