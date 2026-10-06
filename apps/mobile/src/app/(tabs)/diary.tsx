import { addDays, MEAL_TYPE_ORDER, PLANS } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, Screen } from '@/components';
import { MealSection } from '@/features/diary/components/MealSection';
import { MonthCalendar, type DayCell } from '@/features/diary/components/MonthCalendar';
import { useDaySummary } from '@/features/diary/useDaySummary';
import { goalForDate } from '@/features/goals/hooks';
import { repos } from '@/services/db/repository';
import { usePlan } from '@/services/purchases';
import { useUiStore } from '@/stores/ui';
import { spacing } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

export default function Diary() {
  const { t } = useTranslation();
  const date = useUiStore((s) => s.selectedDate);
  const setDate = useUiStore((s) => s.setSelectedDate);
  // The visible month follows the selected date (e.g. picked on Today) unless the user pages it.
  const [view, setView] = useState({ month: date.slice(0, 7), forDate: date });
  if (view.forDate !== date) setView({ month: date.slice(0, 7), forDate: date });
  const month = view.month;
  const setMonth = (m: string) => setView({ month: m, forDate: date });
  const plan = usePlan();
  const historyDays = PLANS[plan].historyDays;
  const lockedBefore = historyDays ? addDays(todayLocal(), -historyDays) : null;
  const day = useDaySummary(date);

  const monthData = useQuery({
    queryKey: ['db', 'meals', 'month', month],
    queryFn: async () => {
      const [meals, goals] = await Promise.all([
        repos.meals.list({ from: `${month}-01`, to: `${month}-31` }),
        repos.goals.list(),
      ]);
      const map = new Map<string, DayCell>();
      for (const m of meals) {
        const cell = map.get(m.local_date) ?? {
          kcal: 0,
          target: goalForDate(goals, m.local_date).kcal,
        };
        cell.kcal += m.totals.kcal;
        map.set(m.local_date, cell);
      }
      return map;
    },
  });

  const locked = !!lockedBefore && date < lockedBefore;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {t('tabs.diary')}
      </AppText>
      <Card>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          selected={date}
          onSelect={setDate}
          data={monthData.data ?? new Map()}
          lockedBefore={lockedBefore}
        />
      </Card>
      <View style={styles.dayHeader}>
        <AppText variant="heading" style={styles.flex}>
          {formatDay(date)}
        </AppText>
        {!locked && day.meals.length ? (
          <AppText variant="bodyStrong" tabular>
            {formatKcal(day.summary.consumed.kcal)} / {formatKcal(day.goal.kcal)} kcal
          </AppText>
        ) : null}
      </View>
      {locked ? (
        <Card>
          <EmptyState
            icon="lock-closed"
            title={t('diary.lockedTitle')}
            message={t('diary.lockedMessage', { days: historyDays })}
            actionLabel={t('paywall.seePlans')}
            onAction={() => router.push({ pathname: '/paywall', params: { context: 'feature' } })}
          />
        </Card>
      ) : (
        <>
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
          <View style={styles.actions}>
            <Button
              label={t('diary.recipes')}
              variant="outline"
              icon="book"
              fullWidth={false}
              onPress={() => router.push('/recipes')}
            />
            <Button
              label={t('diary.customFood')}
              variant="outline"
              icon="create"
              fullWidth={false}
              onPress={() => router.push('/custom-food')}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
