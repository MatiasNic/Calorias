import type { IsoDate } from '@bocado/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { useStreak } from '@/features/habits/hooks';
import { useProfile } from '@/features/profile/hooks';
import { repos } from '@/services/db/repository';
import { fontFamily, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';

import { WeekStrip } from './WeekStrip';

/**
 * Greeting and day title (tapping it shows the week strip to change day), the streak badge (once
 * something is logged) and the coach shortcut.
 */
export function TodayHeader({
  date,
  onChangeDate,
  hasMeals,
}: {
  date: IsoDate;
  onChangeDate: (date: IsoDate) => void;
  hasMeals: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [showWeek, setShowWeek] = useState(false);
  const profile = useProfile();
  const streak = useStreak();
  const logged = useQuery({
    queryKey: ['db', 'meals', 'dates'],
    queryFn: () => repos.meals.dates(),
  });
  const isToday = date === todayLocal();
  const initial = profile.data?.display_name?.trim().charAt(0).toUpperCase() ?? '';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('today.morning') : hour < 20 ? t('today.afternoon') : t('today.evening');
  const dayLabel = formatDay(date, { weekday: 'long', day: 'numeric' });
  const title = isToday
    ? `${t('common.today')}, ${dayLabel.charAt(0).toLowerCase()}${dayLabel.slice(1)}`
    : dayLabel;

  return (
    <>
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
        {hasMeals && streak.data && streak.data.current > 0 ? (
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
          accessibilityLabel={t('tabs.profile')}
          testID="tab-profile"
          onPress={() => router.navigate('/profile')}
          style={[styles.coach, { backgroundColor: colors.surface }]}
        >
          {initial ? (
            <AppText variant="bodyStrong">{initial}</AppText>
          ) : (
            <Icon name="person" size={22} />
          )}
        </Pressable>
      </View>
      {showWeek ? (
        <WeekStrip value={date} onChange={onChangeDate} loggedDates={new Set(logged.data ?? [])} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
});
