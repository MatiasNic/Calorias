import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENTS,
  achievementProgress,
  type Achievement,
} from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Card,
  Icon,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionHeader,
  type IconName,
} from '@/components';
import { useAchievementStats } from '@/features/habits/hooks';
import { repos } from '@/services/db/repository';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay } from '@/utils/dates';
import { formatNumber } from '@/utils/format';

export default function Achievements() {
  const { t } = useTranslation();
  const unlocked = useQuery({
    queryKey: ['db', 'achievements'],
    queryFn: () => repos.achievements.list(),
  });
  const stats = useAchievementStats();
  const map = new Map((unlocked.data ?? []).map((a) => [a.id, a.unlocked_at]));
  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((a) => map.has(a.id)).length;

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('achievements.title')} />
      <Card style={styles.summary}>
        <AppText variant="heading">{t('achievements.summary', { unlocked: done, total })}</AppText>
        <ProgressBar progress={done / total} height={8} />
      </Card>
      {ACHIEVEMENT_CATEGORIES.map((category) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === category);
        // Unlocked first, then the closest ones to unlock.
        const sorted = [...items].sort((a, b) => {
          const ua = map.has(a.id) ? 1 : 0;
          const ub = map.has(b.id) ? 1 : 0;
          if (ua !== ub) return ub - ua;
          return (
            achievementProgress(b, stats.data ?? {}) - achievementProgress(a, stats.data ?? {})
          );
        });
        const count = items.filter((a) => map.has(a.id)).length;
        return (
          <View key={category} style={styles.section}>
            <SectionHeader
              title={`${t(`achievements.categories.${category}`)} · ${count}/${items.length}`}
            />
            <View style={styles.grid}>
              {sorted.map((a) => (
                <AchievementCell
                  key={a.id}
                  a={a}
                  unlockedAt={map.get(a.id)}
                  current={stats.data?.[a.metric] ?? 0}
                />
              ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

function AchievementCell({
  a,
  unlockedAt,
  current,
}: {
  a: Achievement;
  unlockedAt: string | undefined;
  current: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const title = t(`achievements.metrics.${a.metric}.title`, { count: a.threshold });
  const description = t(`achievements.metrics.${a.metric}.description`, { count: a.threshold });
  const progress = Math.min(1, current / a.threshold);
  return (
    <View style={styles.cell}>
      <Card
        style={unlockedAt ? styles.card : [styles.card, styles.locked]}
        accessibilityLabel={`${title}. ${description}${unlockedAt ? '' : `, ${t('achievements.lockedLabel')}`}`}
      >
        <View
          style={[
            styles.badge,
            { backgroundColor: unlockedAt ? colors.accent : colors.surfaceAlt },
          ]}
        >
          <Icon
            name={(unlockedAt ? a.icon : `${a.icon}-outline`) as IconName}
            color={unlockedAt ? 'primary' : 'textSubtle'}
            size={24}
          />
        </View>
        <AppText variant="bodyStrong" align="center" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" color="textMuted" align="center" numberOfLines={3}>
          {unlockedAt
            ? formatDay(unlockedAt.slice(0, 10), { day: 'numeric', month: 'short' })
            : description}
        </AppText>
        {!unlockedAt && current > 0 ? (
          <View style={styles.progress}>
            <ProgressBar progress={progress} color={colors.kcal} />
            <AppText variant="caption" color="textSubtle" align="center" tabular>
              {t('achievements.progress', {
                current: formatNumber(Math.min(current, a.threshold), 0),
                target: formatNumber(a.threshold, 0),
              })}
            </AppText>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.sm },
  section: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '47%' },
  card: { alignItems: 'center', gap: spacing.xs + 2, minHeight: 150 },
  locked: { opacity: 0.7 },
  progress: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.xs },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
