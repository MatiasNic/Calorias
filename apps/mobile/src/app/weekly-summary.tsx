import { addDays, computeStreak, fillDays, PLANS, startOfWeek } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card, IconButton, Screen, ScreenHeader, Skeleton } from '@/components';
import { BarChart } from '@/components/charts';
import { useWeekRange } from '@/features/progress/hooks';
import { weeklyReport } from '@/features/progress/weekly';
import { repos } from '@/services/db/repository';
import { usePlan } from '@/services/purchases';
import { usePrefsStore } from '@/stores/prefs';
import { spacing } from '@/theme';
import { formatDay, todayLocal, weekdayShort } from '@/utils/dates';
import { formatKcal, formatWeight } from '@/utils/format';

/** Current week by default; the Monday notification opens last week (`?week=last`). */
export default function WeeklySummary() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ week?: string }>();
  const units = usePrefsStore((s) => s.units);
  const plan = usePlan();
  const [weekStart, setWeekStart] = useState(() =>
    addDays(startOfWeek(todayLocal()), params.week === 'last' ? -7 : 0),
  );
  const historyDays = PLANS[plan].historyDays;
  const oldestAllowed = historyDays ? addDays(todayLocal(), -historyDays) : null;
  const canGoBack = !oldestAllowed || addDays(weekStart, -1) >= oldestAllowed;
  const weekEnd = addDays(weekStart, 6);
  const q = useWeekRange(weekStart);
  const streak = useQuery({
    queryKey: ['db', 'meals', 'streak'],
    queryFn: async () => computeStreak(await repos.meals.dates(), todayLocal()),
  });

  const report = q.data
    ? weeklyReport(q.data.days, weekStart, weekEnd, q.data.goal.protein_g)
    : null;
  const weights = q.data?.weights.filter((p) => p.date >= weekStart && p.date <= weekEnd) ?? [];
  const change =
    weights.length >= 2 ? weights[weights.length - 1]!.trendKg - weights[0]!.trendKg : null;
  const changeFmt = change != null ? formatWeight(Math.abs(change), units) : null;

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('weekly.title')} />
      <View style={styles.nav}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={t('diary.prevWeek')}
          disabled={!canGoBack}
          onPress={() => setWeekStart(addDays(weekStart, -7))}
        />
        <AppText variant="subheading" style={styles.flex} align="center">
          {t('weekly.subtitle', {
            from: formatDay(weekStart, { day: 'numeric', month: 'short' }),
            to: formatDay(weekEnd, { day: 'numeric', month: 'short' }),
          })}
        </AppText>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel={t('diary.nextWeek')}
          disabled={weekEnd >= todayLocal()}
          onPress={() => setWeekStart(addDays(weekStart, 7))}
        />
      </View>
      {!report || !q.data ? (
        <Skeleton height={300} />
      ) : (
        <>
          <Card style={styles.card}>
            <AppText variant="title" tabular>
              {t('weekly.avg', { kcal: formatKcal(report.summary.avg.kcal) })}
            </AppText>
            <AppText color="textMuted">
              {t('weekly.vsGoal', { kcal: formatKcal(q.data.goal.kcal) })}
            </AppText>
            <BarChart
              accessibilityLabel={t('progress.caloriesA11y', { avg: report.summary.avg.kcal })}
              target={q.data.goal.kcal}
              data={fillDays(q.data.days, weekStart, weekEnd, q.data.goal.kcal).map((d) => ({
                label: weekdayShort(d.date),
                value: d.totals.kcal,
              }))}
            />
          </Card>
          <Card style={styles.card}>
            <AppText>✅ {t('weekly.logged', { count: report.summary.loggedDays })}</AppText>
            <AppText>🎯 {t('weekly.inRange', { count: report.summary.daysInRange })}</AppText>
            <AppText>🔥 {t('weekly.streak', { count: streak.data?.current ?? 0 })}</AppText>
            {changeFmt && change != null ? (
              <AppText>
                ⚖️{' '}
                {t('weekly.weightChange', {
                  value: `${change < 0 ? '−' : '+'}${changeFmt.value}`,
                  unit: changeFmt.unit,
                })}
              </AppText>
            ) : null}
          </Card>
          <Banner
            tone="info"
            title={t('weekly.suggestionTitle')}
            icon="bulb"
            message={t(`weekly.suggestions.${report.suggestion}`, {
              value: Math.round(report.summary.avg.protein_g),
              target: Math.round(q.data.goal.protein_g),
            })}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  card: { gap: spacing.sm },
});
