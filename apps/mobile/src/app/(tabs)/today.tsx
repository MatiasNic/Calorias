import { nextMealTypeToLog, sortMealsForDay } from '@plato/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, ErrorState, Screen, Skeleton } from '@/components';
import { CaloriesCard } from '@/features/diary/components/CaloriesCard';
import { InsightCard } from '@/features/diary/components/InsightCard';
import { LogBar } from '@/features/diary/components/LogBar';
import { MacrosCard } from '@/features/diary/components/MacrosCard';
import { TodayEmpty } from '@/features/diary/components/TodayEmpty';
import { TodayHeader } from '@/features/diary/components/TodayHeader';
import { TodayMeals } from '@/features/diary/components/TodayMeals';
import { UsualMeals } from '@/features/diary/components/UsualMeals';
import { WaterWeightRow } from '@/features/diary/components/WaterWeightRow';
import { useDaySummary } from '@/features/diary/useDaySummary';
import { useRestrictionCheck } from '@/features/habits/hooks';
import { pickInsight } from '@/features/habits/insights';
import { ActivityRow } from '@/features/training/components/ActivityRow';
import { useWidgetSync } from '@/features/widgets/useWidgetSync';
import { syncNow } from '@/services/sync/engine';
import { useUiStore } from '@/stores/ui';
import { radii } from '@/theme';
import { todayLocal } from '@/utils/dates';

export default function Today() {
  const { t } = useTranslation();
  const date = useUiStore((s) => s.selectedDate);
  const setDate = useUiStore((s) => s.setSelectedDate);
  const day = useDaySummary(date);
  const restriction = useRestrictionCheck();
  // The spinner follows the user's pull-to-refresh only, not every background sync.
  const [pulling, setPulling] = useState(false);
  const pullToRefresh = () => {
    setPulling(true);
    syncNow()
      .catch(() => undefined) // the engine reports sync failures itself
      .finally(() => setPulling(false));
  };
  const isToday = date === todayLocal();
  const hour = new Date().getHours();
  const insight = pickInsight(day.summary, day.waterMl, day.goal.water_ml, isToday ? hour : 23);
  const meals = sortMealsForDay(day.meals);
  const nextType = nextMealTypeToLog(
    meals.map((m) => m.meal_type),
    hour,
  );

  // Home-screen widgets show today's numbers (only while looking at today).
  useWidgetSync({
    isLoading: day.isLoading || !isToday,
    summary: day.summary,
    waterMl: day.waterMl,
    waterTargetMl: day.goal.water_ml ?? 2000,
  });

  return (
    <Screen onRefresh={pullToRefresh} refreshing={pulling} testID="today-screen">
      <View style={styles.page}>
        <TodayHeader date={date} onChangeDate={setDate} hasMeals={meals.length > 0} />

        <LogBar date={date} />
        {meals.length ? <UsualMeals date={date} /> : null}

        {day.isError ? <ErrorState onRetry={() => day.refetch()} /> : null}
        {day.isLoading ? (
          <Skeleton height={260} radius={radii.xxl} />
        ) : (
          <>
            <CaloriesCard summary={day.summary} steps={isToday ? day.steps : null} />
            <MacrosCard summary={day.summary} />
          </>
        )}
        {restriction.data ? (
          <Banner
            tone="info"
            title={t('support.title')}
            message={t('support.message')}
            icon="favorite"
          />
        ) : null}
        {meals.length ? (
          <>
            <TodayMeals meals={meals} date={date} nextType={nextType} />
            <InsightCard insight={insight} />
          </>
        ) : day.isLoading ? null : (
          <TodayEmpty date={date} />
        )}
        <WaterWeightRow date={date} waterMl={day.waterMl} waterTarget={day.goal.water_ml} />
        <ActivityRow date={date} workouts={day.workouts} burnedKcal={day.burnedKcal} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22, paddingTop: 6 },
});
