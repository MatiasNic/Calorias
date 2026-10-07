import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '@/components';
import { useTrainingOverview, useWorkouts } from '@/features/training/hooks';
import { activityIcon, exerciseName, formatLoad, workoutTitle } from '@/features/training/labels';
import { usePrefsStore } from '@/stores/prefs';
import { spacing } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';
import { formatKcal, formatNumber } from '@/utils/format';

const HISTORY_LIMIT = 60;
const RECORDS_LIMIT = 10;

export default function Training() {
  const { t } = useTranslation();
  const units = usePrefsStore((s) => s.units);
  const today = todayLocal();
  const overview = useTrainingOverview(today);
  const workouts = useWorkouts();
  const week = overview.data?.week;
  const records = (overview.data?.records ?? []).slice(0, RECORDS_LIMIT);
  const openNew = () => router.push({ pathname: '/workout', params: { date: today } });

  const stat = (value: string, label: string) => (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <AppText variant="number" tabular>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <Button label={t('training.log')} icon="add" onPress={openNew} testID="training-log" />
      }
    >
      <ScreenHeader title={t('training.title')} />
      {workouts.data?.length ? (
        <>
          <Card style={styles.weekCard}>
            <AppText variant="label" color="textMuted">
              {t('training.week')}
            </AppText>
            <View style={styles.stats}>
              {stat(String(week?.sessions ?? 0), t('training.sessionsLabel'))}
              {stat(formatNumber(week?.minutes ?? 0), t('training.minutes'))}
              {stat(formatKcal(week?.kcal ?? 0), 'kcal')}
              {stat(`${week?.activeDays ?? 0}/7`, t('training.activeDays'))}
            </View>
          </Card>

          {records.length ? (
            <>
              <SectionHeader title={t('training.records')} />
              <Card padded={false}>
                {records.map((r) => (
                  <ListRow
                    key={r.key}
                    icon="trophy-outline"
                    title={exerciseName(r.key)}
                    subtitle={
                      r.maxKg > 0
                        ? `${t('training.recordE1rm', { kg: formatLoad(r.e1rm, units) })} · ${t(
                            'training.recordBest',
                            { kg: formatLoad(r.maxKg, units), reps: r.maxReps },
                          )}`
                        : t('training.recordReps', { reps: r.maxReps })
                    }
                    value={formatDay(r.date, { day: 'numeric', month: 'short' })}
                  />
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title={t('training.history')} />
          <Card padded={false}>
            {workouts.data.slice(0, HISTORY_LIMIT).map((w) => (
              <ListRow
                key={w.id}
                icon={activityIcon(w.activity)}
                title={workoutTitle(w)}
                subtitle={[
                  formatDay(w.local_date, { weekday: 'short', day: 'numeric', month: 'short' }),
                  `${w.duration_min} min`,
                  `${formatKcal(w.kcal)} kcal`,
                  w.exercises.length
                    ? w.exercises.map((e) => exerciseName(e.key)).join(', ')
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => router.push({ pathname: '/workout', params: { id: w.id } })}
              />
            ))}
          </Card>
          <AppText variant="caption" color="textSubtle">
            {t('training.disclaimer')}
          </AppText>
        </>
      ) : workouts.isLoading ? null : (
        <EmptyState
          icon="barbell-outline"
          title={t('training.empty')}
          message={t('training.emptyHint')}
          actionLabel={t('training.log')}
          onAction={openNew}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekCard: { gap: spacing.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  stat: { flex: 1, gap: spacing.xxs },
});
