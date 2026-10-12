import { MEAL_TYPE_ORDER, suggestMealType } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Chip,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  Skeleton,
  toast,
} from '@/components';
import { CaloriesCard } from '@/features/diary/components/CaloriesCard';
import { InsightCard } from '@/features/diary/components/InsightCard';
import { LogBar } from '@/features/diary/components/LogBar';
import { MacrosCard } from '@/features/diary/components/MacrosCard';
import { MealRow } from '@/features/diary/components/MealRow';
import { UsualMeals } from '@/features/diary/components/UsualMeals';
import { WaterWeightRow } from '@/features/diary/components/WaterWeightRow';
import { WeekStrip } from '@/features/diary/components/WeekStrip';
import { repeatFromYesterday } from '@/features/diary/hooks';
import { useDaySummary } from '@/features/diary/useDaySummary';
import { useRestrictionCheck, useStreak } from '@/features/habits/hooks';
import { ActivityRow } from '@/features/training/components/ActivityRow';
import { pickInsight } from '@/features/habits/insights';
import { useProfile } from '@/features/profile/hooks';
import { repos } from '@/services/db/repository';
import { syncNow } from '@/services/sync/engine';
import { useWidgetSync } from '@/features/widgets/useWidgetSync';
import { useUiStore } from '@/stores/ui';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
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
  // The spinner follows the user's pull-to-refresh only, not every background sync.
  const [pulling, setPulling] = useState(false);
  const pullToRefresh = () => {
    setPulling(true);
    syncNow()
      .catch(() => undefined)
      .finally(() => setPulling(false));
  };
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

  const examples = [t('today.example1'), t('today.example2')];

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
              <AppText style={styles.title} accessibilityRole="header" numberOfLines={1}>
                {title}
              </AppText>
              <Icon name={showWeek ? 'expand_less' : 'expand_more'} size={22} color="textMuted" />
            </View>
          </Pressable>
          {meals.length && streak.data && streak.data.current > 0 ? (
            <View
              style={[styles.streak, { backgroundColor: colors.surface }]}
              accessible
              accessibilityLabel={t('today.streakA11y', { count: streak.data.current })}
            >
              <Icon name="local_fire_department" size={20} color="carbs" />
              <AppText variant="bodyStrong">{streak.data.current}</AppText>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('coach.title')}
            onPress={() => router.push('/coach')}
            style={[styles.coach, { backgroundColor: colors.surface }]}
          >
            <Icon name="auto_awesome" size={22} />
          </Pressable>
        </View>
        {showWeek ? (
          <WeekStrip value={date} onChange={setDate} loggedDates={new Set(logged.data ?? [])} />
        ) : null}

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
            <View style={styles.sectionHeader}>
              <AppText style={styles.section} accessibilityRole="header">
                {t('today.meals')}
              </AppText>
              <AppText variant="caption" color="textMuted" tabular>
                {formatKcal(totalKcal)} kcal
              </AppText>
            </View>
            <View style={styles.meals}>
              {meals.map((m) => (
                <MealRow key={m.id} meal={m} card />
              ))}
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
                  color="textSubtle"
                  accessibilityLabel={t('diary.repeatYesterday', { meal: nextLabel })}
                  onPress={repeat}
                />
                <IconButton
                  icon="mic"
                  size={22}
                  color="textMuted"
                  accessibilityLabel={t('logBar.voice')}
                  onPress={() => router.push({ pathname: '/listen', params: { date } })}
                />
              </View>
            </View>
            <InsightCard insight={insight} />
          </>
        ) : day.isLoading ? null : (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('logBar.voice')}
              onPress={() => router.push({ pathname: '/listen', params: { date } })}
              style={[styles.emptyMic, { backgroundColor: colors.surfaceAlt }]}
            >
              <Icon name="mic" size={30} />
            </Pressable>
            <AppText style={styles.emptyTitle} align="center">
              {t('today.emptyTitle')}
            </AppText>
            <AppText color="textMuted" align="center">
              {t('today.emptyBody')}
            </AppText>
            <View style={styles.examples}>
              {examples.map((e) => (
                <Chip
                  key={e}
                  label={`«${e}»`}
                  onPress={() =>
                    router.push({
                      pathname: '/analyzing',
                      params: { text: e, source: 'text', date },
                    })
                  }
                />
              ))}
            </View>
          </View>
        )}
        <WaterWeightRow date={date} waterMl={day.waterMl} waterTarget={day.goal.water_ml} />
        <ActivityRow date={date} workouts={day.workouts} burnedKcal={day.burnedKcal} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22, paddingTop: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontFamily: fontFamily.extrabold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  flex: { flex: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: 16,
  },
  coach: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: -spacing.sm,
  },
  section: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26 },
  meals: { gap: spacing.sm },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    paddingLeft: spacing.lg,
    minHeight: 56,
  },
  addMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.xxxl,
    padding: spacing.xxl,
  },
  emptyMic: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26 },
  examples: { gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
});
