import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, type IconName } from '@/components';
import type { Insight } from '@/features/habits/insights';
import { radii, spacing, useTheme } from '@/theme';

const ICON: Record<Insight['kind'], IconName> = {
  start_day: 'sunny-outline',
  protein_gap: 'barbell-outline',
  water_low: 'water-outline',
  fiber_low: 'leaf-outline',
  over_target: 'information-circle-outline',
  on_track: 'checkmark-circle-outline',
  goal_reached: 'trophy-outline',
};

export function InsightCard({ insight }: { insight: Insight }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params =
    'grams' in insight
      ? { grams: insight.grams }
      : 'ml' in insight
        ? { ml: insight.ml }
        : 'kcal' in insight
          ? { kcal: Math.round(insight.kcal) }
          : {};
  return (
    <Card style={styles.card} accessibilityLabel={t(`insights.${insight.kind}.title`, params)}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name={ICON[insight.kind]} color="text" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{t(`insights.${insight.kind}.title`, params)}</AppText>
        <AppText variant="label" color="textMuted">
          {t(`insights.${insight.kind}.body`, params)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
