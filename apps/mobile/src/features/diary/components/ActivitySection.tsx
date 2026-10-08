import type { IsoDate } from '@plato/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, IconButton, ListRow } from '@/components';
import { useWorkoutsForDate } from '@/features/training/hooks';
import { activityIcon, exerciseName, workoutTitle } from '@/features/training/labels';
import { spacing, useTheme } from '@/theme';
import { formatTime } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

/** The day's workouts inside the diary, logged and edited from the same place as meals. */
export function ActivitySection({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const workouts = useWorkoutsForDate(date);
  const list = [...(workouts.data ?? [])].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const kcal = list.reduce((s, w) => s + w.kcal, 0);
  const minutes = list.reduce((s, w) => s + w.duration_min, 0);

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="subheading" accessibilityRole="header">
            {t('diary.activity')}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {list.length
              ? t('diary.activitySummary', { minutes, kcal: formatKcal(kcal) })
              : t('diary.empty')}
          </AppText>
        </View>
        <IconButton
          icon="notifications-outline"
          accessibilityLabel={t('diary.activityReminder')}
          color="textMuted"
          size={20}
          onPress={() => router.push('/settings/reminders')}
        />
        <IconButton
          icon="add-circle"
          accessibilityLabel={t('training.log')}
          color="primary"
          size={28}
          testID="diary-add-activity"
          onPress={() => router.push({ pathname: '/workout', params: { date } })}
        />
      </View>
      {list.map((w, i) => (
        <View
          key={w.id}
          style={i > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}
        >
          <ListRow
            icon={activityIcon(w.activity)}
            title={workoutTitle(w)}
            subtitle={[
              formatTime(w.started_at),
              `${w.duration_min} min`,
              `${formatKcal(w.kcal)} kcal`,
              w.exercises.length ? w.exercises.map((e) => exerciseName(e.key)).join(', ') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            chevron
            onPress={() => router.push({ pathname: '/workout', params: { id: w.id } })}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
});
