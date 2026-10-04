import { MEAL_TYPE_ORDER } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, ErrorState, Icon, IconButton, Screen, Skeleton } from '@/components';
import { CaloriesCard } from '@/features/diary/components/CaloriesCard';
import { InsightCard } from '@/features/diary/components/InsightCard';
import { MacrosCard } from '@/features/diary/components/MacrosCard';
import { MealSection } from '@/features/diary/components/MealSection';
import { QuickActions } from '@/features/diary/components/QuickActions';
import { WaterWeightRow } from '@/features/diary/components/WaterWeightRow';
import { WeekStrip } from '@/features/diary/components/WeekStrip';
import { useDaySummary } from '@/features/diary/useDaySummary';
import { useRestrictionCheck, useStreak } from '@/features/habits/hooks';
import { pickInsight } from '@/features/habits/insights';
import { useProfile } from '@/features/profile/hooks';
import { repos } from '@/services/db/repository';
import { syncNow, useSyncStatus } from '@/services/sync/engine';
import { useUiStore } from '@/stores/ui';
import { spacing } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';

export default function Today() {
  const { t } = useTranslation();
  const date = useUiStore((s) => s.selectedDate);
  const setDate = useUiStore((s) => s.setSelectedDate);
  const profile = useProfile();
  const day = useDaySummary(date);
  const streak = useStreak();
  const restriction = useRestrictionCheck();
  const syncing = useSyncStatus((s) => s.syncing);
  const logged = useQuery({
    queryKey: ['db', 'meals', 'dates'],
    queryFn: () => repos.meals.dates(),
  });
  const isToday = date === todayLocal();
  const insight = pickInsight(
    day.summary,
    day.waterMl,
    day.goal.water_ml,
    isToday ? new Date().getHours() : 23,
  );
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('today.morning') : hour < 20 ? t('today.afternoon') : t('today.evening');

  return (
    <Screen onRefresh={() => syncNow()} refreshing={syncing} testID="today-screen">
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="label" color="textMuted">
            {isToday
              ? greeting + (profile.data?.display_name ? `, ${profile.data.display_name}` : '')
              : formatDay(date)}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {isToday ? t('common.today') : formatDay(date, { weekday: 'long', day: 'numeric' })}
          </AppText>
        </View>
        {streak.data && streak.data.current > 0 ? (
          <View
            style={styles.streak}
            accessible
            accessibilityLabel={t('today.streakA11y', { count: streak.data.current })}
          >
            <Icon name="flame" color="accent" />
            <AppText variant="bodyStrong">{streak.data.current}</AppText>
          </View>
        ) : null}
        <IconButton
          icon="sparkles"
          accessibilityLabel={t('coach.title')}
          color="primary"
          onPress={() => router.push('/coach')}
        />
      </View>
      <WeekStrip value={date} onChange={setDate} loggedDates={new Set(logged.data ?? [])} />
      {day.isError ? <ErrorState onRetry={() => day.refetch()} /> : null}
      {day.isLoading ? (
        <Skeleton height={300} radius={20} />
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
          icon="heart"
        />
      ) : null}
      <InsightCard insight={insight} />
      <QuickActions date={date} />
      {MEAL_TYPE_ORDER.filter(
        (type) => type !== 'other' || day.meals.some((m) => m.meal_type === 'other'),
      ).map((type) => (
        <MealSection
          key={type}
          type={type}
          date={date}
          meals={day.meals.filter((m) => m.meal_type === type)}
        />
      ))}
      <WaterWeightRow date={date} waterMl={day.waterMl} waterTarget={day.goal.water_ml} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm },
});
