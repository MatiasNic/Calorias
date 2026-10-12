import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, type SymbolName } from '@/components';
import type { Insight } from '@/features/habits/insights';
import { radii, spacing, useTheme, type ThemeColors } from '@/theme';

const ICON: Record<Insight['kind'], { name: SymbolName; color: keyof ThemeColors }> = {
  start_day: { name: 'light_mode', color: 'carbs' },
  protein_gap: { name: 'egg_alt', color: 'protein' },
  water_low: { name: 'water_drop', color: 'water' },
  fiber_low: { name: 'eco', color: 'kcal' },
  over_target: { name: 'info', color: 'textMuted' },
  on_track: { name: 'check_circle', color: 'kcal' },
  goal_reached: { name: 'emoji_events', color: 'carbs' },
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
        <Icon name={ICON[insight.kind].name} color={ICON[insight.kind].color} />
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
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
