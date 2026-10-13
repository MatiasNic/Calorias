import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import { BarChart } from '@/components/charts';
import { spacing, useTheme } from '@/theme';
import { todayLocal, weekdayShort } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

import { Stat, statStyles } from './Stat';
import type { ProgressData } from './types';

/** Average kcal, adherence, logged days and the daily calories bar chart. */
export function CaloriesSummaryCard({ data, days }: { data: ProgressData; days: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <AppText variant="subheading">{t('progress.calories')}</AppText>
      <View style={statStyles.stats}>
        <Stat label={t('progress.avgPerDay')} value={`${formatKcal(data.summary.avg.kcal)}`} />
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
            label: days <= 7 ? weekdayShort(d.date) : String(Number(d.date.slice(8))),
            value: d.totals.kcal,
            highlight: d.date === todayLocal(),
          }))}
        />
      ) : (
        <AppText color="textMuted">{t('progress.noData')}</AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
});
