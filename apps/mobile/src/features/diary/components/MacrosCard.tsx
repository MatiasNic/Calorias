import type { DailySummary } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ProgressBar } from '@/components';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

/** Protein / carbs / fat side by side: dot + name, "52 /164 g" and a thin bar each. */
export function MacrosCard({ summary }: { summary: DailySummary }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const macros = [
    {
      label: t('macros.protein'),
      value: summary.consumed.protein_g,
      target: summary.target.protein_g,
      color: colors.protein,
    },
    {
      label: t('macros.carbs'),
      value: summary.consumed.carbs_g,
      target: summary.target.carbs_g,
      color: colors.carbs,
    },
    {
      label: t('macros.fat'),
      value: summary.consumed.fat_g,
      target: summary.target.fat_g,
      color: colors.fat,
    },
  ];
  return (
    <Card style={styles.card}>
      {macros.map((m) => (
        <View
          key={m.label}
          style={styles.col}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${m.label}: ${Math.round(m.value)} g / ${Math.round(m.target)} g`}
        >
          <View style={styles.head}>
            <View style={[styles.dot, { backgroundColor: m.color }]} />
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {m.label}
            </AppText>
          </View>
          <AppText style={styles.value} tabular numberOfLines={1}>
            {Math.round(m.value)}
            <AppText variant="caption" color="textSubtle">
              /{Math.round(m.target)} g
            </AppText>
          </AppText>
          <ProgressBar
            progress={m.target > 0 ? Math.min(1, m.value / m.target) : 0}
            color={m.color}
            height={5}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: 18,
    borderRadius: radii.xxl,
  },
  col: { flex: 1, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  value: { fontFamily: fontFamily.extrabold, fontSize: 19, lineHeight: 24 },
});
