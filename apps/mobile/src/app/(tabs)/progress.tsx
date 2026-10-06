import { kgToLb, PLANS, projectGoalDate } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Card,
  EmptyState,
  ListRow,
  Screen,
  SegmentedControl,
  Skeleton,
} from '@/components';
import { BarChart, LineChart } from '@/components/charts';
import { useProfile } from '@/features/profile/hooks';
import { useProgress } from '@/features/progress/hooks';
import { usePlan } from '@/services/purchases';
import { usePrefsStore } from '@/stores/prefs';
import { spacing, useTheme } from '@/theme';
import { formatDay, todayLocal, weekdayShort } from '@/utils/dates';
import { formatKcal, formatNumber, formatWeight } from '@/utils/format';

type Range = 7 | 30 | 90;

export default function Progress() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plan = usePlan();
  const units = usePrefsStore((s) => s.units);
  const maxDays = PLANS[plan].progressChartDays;
  const [range, setRange] = useState<Range>(7);
  const effective = (maxDays && range > maxDays ? maxDays : range) as Range;
  const q = useProgress(effective);
  const profile = useProfile();
  const w = (kg: number) => (units === 'imperial' ? kgToLb(kg) : kg);

  const changeRange = (r: Range) => {
    if (maxDays && r > maxDays) {
      router.push({ pathname: '/paywall', params: { context: 'feature' } });
      return;
    }
    setRange(r);
  };

  const data = q.data;
  const target = profile.data?.target_weight_kg ?? null;
  const lastTrend = data?.trend[data.trend.length - 1];
  const projection =
    lastTrend && target && data?.rate
      ? projectGoalDate(lastTrend.trendKg, target, data.rate, new Date())
      : null;
  const totalMealKcal = data ? [...data.byMealType.values()].reduce((a, b) => a + b, 0) : 0;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {t('progress.title')}
      </AppText>
      <SegmentedControl<string>
        value={String(effective)}
        onChange={(v) => changeRange(Number(v) as Range)}
        options={[
          { value: '7', label: t('progress.range.week') },
          {
            value: '30',
            label: `${t('progress.range.month')}${maxDays && maxDays < 30 ? ' 🔒' : ''}`,
          },
          {
            value: '90',
            label: `${t('progress.range.quarter')}${maxDays && maxDays < 90 ? ' 🔒' : ''}`,
          },
        ]}
      />
      {q.isLoading || !data ? (
        <Skeleton height={240} radius={20} />
      ) : (
        <>
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
                  <AppText
                    variant="caption"
                    color="textMuted"
                  >{`  ${t('progress.trend')}`}</AppText>
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

          <Card style={styles.card}>
            <AppText variant="subheading">{t('progress.calories')}</AppText>
            <View style={styles.stats}>
              <Stat
                label={t('progress.avgPerDay')}
                value={`${formatKcal(data.summary.avg.kcal)}`}
              />
              <Stat
                label={t('progress.adherence')}
                value={t('progress.adherenceValue', {
                  inRange: data.summary.daysInRange,
                  logged: data.summary.loggedDays,
                })}
              />
              <Stat
                label={t('progress.loggedDays')}
                value={`${data.summary.loggedDays}/${data.summary.totalDays}`}
              />
            </View>
            {data.summary.loggedDays ? (
              <BarChart
                accessibilityLabel={t('progress.caloriesA11y', { avg: data.summary.avg.kcal })}
                target={data.goal.kcal}
                color={colors.kcal}
                data={data.filled.map((d) => ({
                  label: effective <= 7 ? weekdayShort(d.date) : String(Number(d.date.slice(8))),
                  value: d.totals.kcal,
                  highlight: d.date === todayLocal(),
                }))}
              />
            ) : (
              <AppText color="textMuted">{t('progress.noData')}</AppText>
            )}
          </Card>

          {data.summary.loggedDays ? (
            <Card style={styles.card}>
              <AppText variant="subheading">{t('progress.macrosAvg')}</AppText>
              <View style={styles.stats}>
                <Stat
                  label={t('macros.protein')}
                  value={`${formatNumber(data.summary.avg.protein_g)} g`}
                  color={colors.protein}
                />
                <Stat
                  label={t('macros.carbs')}
                  value={`${formatNumber(data.summary.avg.carbs_g)} g`}
                  color={colors.carbs}
                />
                <Stat
                  label={t('macros.fat')}
                  value={`${formatNumber(data.summary.avg.fat_g)} g`}
                  color={colors.fat}
                />
              </View>
              <AppText variant="subheading">{t('progress.byMealType')}</AppText>
              {[...data.byMealType.entries()].map(([type, kcal]) => (
                <View key={type} style={styles.row}>
                  <AppText style={styles.flex}>{t(`mealTypes.${type as 'lunch'}`)}</AppText>
                  <AppText variant="bodyStrong" tabular>
                    {Math.round((kcal / Math.max(1, totalMealKcal)) * 100)} %
                  </AppText>
                </View>
              ))}
              <AppText variant="subheading">{t('progress.topFoods')}</AppText>
              {data.topFoods.map((f) => (
                <View key={f.name} style={styles.row}>
                  <AppText style={styles.flex} numberOfLines={1}>
                    {f.name}
                  </AppText>
                  <AppText color="textMuted">×{f.count}</AppText>
                </View>
              ))}
            </Card>
          ) : null}

          <Card padded={false}>
            <ListRow
              icon="calendar"
              title={t('progress.weeklySummary')}
              onPress={() => router.push('/weekly-summary')}
            />
            <ListRow
              icon="trophy"
              title={t('progress.achievements')}
              onPress={() => router.push('/achievements')}
            />
            <ListRow
              icon="analytics"
              title={t('progress.adaptiveTitle')}
              value={plan === 'premium' ? undefined : t('common.premium')}
              onPress={() => router.push('/adaptive')}
            />
            <ListRow
              icon="nutrition"
              title={t('micros.title')}
              value={plan === 'premium' ? undefined : t('common.premium')}
              onPress={() => router.push('/micros')}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
