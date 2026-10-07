import { MEAL_TYPE_ORDER, suggestMealType } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  Skeleton,
  toast,
} from '@/components';
import { CaloriesCard } from '@/features/diary/components/CaloriesCard';
import { InsightCard } from '@/features/diary/components/InsightCard';
import { MacrosCard } from '@/features/diary/components/MacrosCard';
import { MealRow } from '@/features/diary/components/MealRow';
import { QuickActions } from '@/features/diary/components/QuickActions';
import { WaterWeightRow } from '@/features/diary/components/WaterWeightRow';
import { WeekStrip } from '@/features/diary/components/WeekStrip';
import { repeatFromYesterday } from '@/features/diary/hooks';
import { useDaySummary } from '@/features/diary/useDaySummary';
import { useRestrictionCheck, useStreak } from '@/features/habits/hooks';
import { ActivityRow } from '@/features/training/components/ActivityRow';
import { pickInsight } from '@/features/habits/insights';
import { useProfile } from '@/features/profile/hooks';
import { repos } from '@/services/db/repository';
import { syncNow, useSyncStatus } from '@/services/sync/engine';
import { useUiStore } from '@/stores/ui';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

export default function Today() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const date = useUiStore((s) => s.selectedDate);
  const setDate = useUiStore((s) => s.setSelectedDate);
  const [showWeek, setShowWeek] = useState(false);
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
  const hour = new Date().getHours();
  const insight = pickInsight(day.summary, day.waterMl, day.goal.water_ml, isToday ? hour : 23);
  const greeting =
    hour < 12 ? t('today.morning') : hour < 20 ? t('today.afternoon') : t('today.evening');
  const dayLabel = formatDay(date, { weekday: 'long', day: 'numeric' });
  const title = isToday
    ? `${t('common.today')}, ${dayLabel.charAt(0).toLowerCase()}${dayLabel.slice(1)}`
    : dayLabel;

  const meals = [...day.meals].sort(
    (a, b) =>
      MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type) ||
      a.eaten_at.localeCompare(b.eaten_at),
  );
  const totalKcal = meals.reduce((s, m) => s + m.totals.kcal, 0);
  const loggedTypes = new Set(meals.map((m) => m.meal_type));
  const nextType =
    MEAL_TYPE_ORDER.find(
      (type) =>
        type !== 'other' &&
        !loggedTypes.has(type) &&
        MEAL_TYPE_ORDER.indexOf(type) >= MEAL_TYPE_ORDER.indexOf(suggestMealType(hour)),
    ) ?? suggestMealType(hour);
  const nextLabel = t(`mealTypes.${nextType}`);

  const repeat = async () => {
    const n = await repeatFromYesterday(date, nextType);
    if (n) toast.success(t('diary.repeated', { count: n }));
    else toast.info(t('diary.nothingYesterday'));
  };

  return (
    <Screen onRefresh={() => syncNow()} refreshing={syncing} testID="today-screen">
      <View style={styles.header}>
        <Pressable
          style={styles.flex}
          accessibilityRole="button"
          accessibilityLabel={t('today.changeDay')}
          accessibilityState={{ expanded: showWeek }}
          onPress={() => setShowWeek((v) => !v)}
        >
          <AppText variant="caption" color="textMuted">
            {greeting + (profile.data?.display_name ? `, ${profile.data.display_name}` : '')}
          </AppText>
          <View style={styles.titleRow}>
            <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
              {title}
            </AppText>
            <Icon name={showWeek ? 'chevron-up' : 'chevron-down'} size={18} color="textMuted" />
          </View>
        </Pressable>
        {streak.data && streak.data.current > 0 ? (
          <View
            style={[styles.streak, { backgroundColor: colors.surfaceAlt }]}
            accessible
            accessibilityLabel={t('today.streakA11y', { count: streak.data.current })}
          >
            <Icon name="flame-outline" size={18} color="text" />
            <AppText variant="label">{streak.data.current}</AppText>
          </View>
        ) : null}
        <IconButton
          icon="sparkles-outline"
          accessibilityLabel={t('coach.title')}
          background="surfaceAlt"
          square
          onPress={() => router.push('/coach')}
        />
      </View>
      {showWeek ? (
        <WeekStrip value={date} onChange={setDate} loggedDates={new Set(logged.data ?? [])} />
      ) : null}
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
          icon="heart"
        />
      ) : null}
      {meals.length ? (
        <>
          <QuickActions date={date} />
          <View style={styles.sectionHeader}>
            <AppText variant="heading" accessibilityRole="header">
              {t('today.meals')}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {formatKcal(totalKcal)} kcal
            </AppText>
          </View>
          <View style={styles.meals}>
            {meals.map((m) => (
              <MealRow key={m.id} meal={m} card />
            ))}
          </View>
          <View style={[styles.addRow, { borderColor: colors.border }]}>
            <Pressable
              testID={`add-${nextType}`}
              accessibilityRole="button"
              accessibilityLabel={t('diary.addTo', { meal: nextLabel })}
              onPress={() =>
                router.push({ pathname: '/food-search', params: { mealType: nextType, date } })
              }
              style={styles.addMain}
            >
              <Icon name="add" color="textMuted" />
              <AppText variant="bodyStrong" color="textMuted">
                {t('today.addMeal', { meal: nextLabel.toLowerCase() })}
              </AppText>
            </Pressable>
            <IconButton
              icon="repeat"
              size={20}
              color="textMuted"
              accessibilityLabel={t('diary.repeatYesterday', { meal: nextLabel })}
              onPress={repeat}
            />
          </View>
          <InsightCard insight={insight} />
        </>
      ) : day.isLoading ? null : (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name="camera-outline" size={26} color="text" />
          </View>
          <AppText variant="heading" align="center">
            {t('today.emptyTitle')}
          </AppText>
          <AppText variant="label" color="textMuted" align="center">
            {t('today.emptyBody')}
          </AppText>
          <View style={styles.emptyActions}>
            <Button
              label={t('today.photo')}
              icon="camera"
              size="sm"
              fullWidth={false}
              onPress={() => router.push('/scan')}
            />
            <Button
              label={t('today.textVoice')}
              icon="mic-outline"
              size="sm"
              variant="secondary"
              fullWidth={false}
              onPress={() => router.push({ pathname: '/text-log', params: { date } })}
            />
          </View>
        </View>
      )}
      <WaterWeightRow date={date} waterMl={day.waterMl} waterTarget={day.goal.water_ml} />
      <ActivityRow date={date} workouts={day.workouts} burnedKcal={day.burnedKcal} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radii.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.xs,
  },
  meals: { gap: spacing.sm },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    paddingLeft: spacing.lg,
  },
  addMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.xxl,
    padding: spacing.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
