import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, type IconName } from '@/components';
import type { Insight } from '@/features/habits/insights';
import { spacing, useTheme } from '@/theme';

const ICON: Record<Insight['kind'], IconName> = {
  start_day: 'sunny',
  protein_gap: 'barbell',
  water_low: 'water',
  fiber_low: 'leaf',
  over_target: 'information-circle',
  on_track: 'checkmark-circle',
  goal_reached: 'trophy',
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
    <Card style={styles.card} accessibilityLabel={t(`insights.${insight.kind}.title`)}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={ICON[insight.kind]} color="primary" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{t(`insights.${insight.kind}.title`)}</AppText>
        <AppText variant="label" color="textMuted">
          {t(`insights.${insight.kind}.body`, params)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
