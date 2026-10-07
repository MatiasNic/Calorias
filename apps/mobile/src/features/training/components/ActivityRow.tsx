import type { IsoDate } from '@plato/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, ProgressBar } from '@/components';
import { useSupplementDay } from '@/features/supplements/hooks';
import type { WorkoutRecord } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { workoutTitle } from '../labels';

/** Today: training and supplements side by side (same layout as water/weight). */
export function ActivityRow({
  date,
  workouts,
  burnedKcal,
}: {
  date: IsoDate;
  workouts: readonly WorkoutRecord[];
  burnedKcal: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const supplements = useSupplementDay(date);
  const rows = supplements.data?.rows ?? [];
  const taken = rows.filter((r) => r.taken).length;
  const hasSupplements = (supplements.data?.supplements.length ?? 0) > 0;
  const minutes = workouts.reduce((s, w) => s + w.duration_min, 0);

  return (
    <View style={styles.row}>
      <Card style={styles.card}>
        <Pressable
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={t('training.title')}
          testID="today-training"
          onPress={() => router.push('/training')}
        >
          <View style={styles.head}>
            <Icon name="barbell-outline" color="text" size={20} />
            <AppText variant="label" color="textMuted">
              {t('training.today')}
            </AppText>
          </View>
          <AppText variant="number" tabular>
            {burnedKcal > 0 ? formatKcal(burnedKcal) : '—'}
            <AppText variant="caption" color="textMuted">
              {burnedKcal > 0 ? ' kcal' : ''}
            </AppText>
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {workouts.length
              ? `${workouts.map(workoutTitle).join(', ')} · ${minutes} min`
              : burnedKcal > 0
                ? t('training.todayFromHealth')
                : t('training.todayNone')}
          </AppText>
        </Pressable>
        <Button
          label={t('training.logShort')}
          accessibilityLabel={t('training.log')}
          size="sm"
          variant="secondary"
          icon="add"
          fullWidth={false}
          testID="today-log-workout"
          onPress={() => router.push({ pathname: '/workout', params: { date } })}
        />
      </Card>
      <Card
        style={styles.card}
        onPress={() => router.push('/supplements')}
        accessibilityLabel={t('supplements.title')}
        testID="today-supplements"
      >
        <View style={styles.head}>
          <Icon name="medkit-outline" color="text" size={20} />
          <AppText variant="label" color="textMuted">
            {t('supplements.today')}
          </AppText>
        </View>
        {rows.length ? (
          <>
            <AppText variant="number" tabular>
              {taken}
              <AppText variant="caption" color="textMuted">{` / ${rows.length}`}</AppText>
            </AppText>
            <ProgressBar progress={taken / rows.length} color={colors.success} height={6} />
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {taken === rows.length ? t('supplements.allDone') : t('supplements.todayList')}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="number">—</AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={2}>
              {hasSupplements ? t('supplements.nothingToday') : t('supplements.todayNone')}
            </AppText>
          </>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  card: { flex: 1, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
