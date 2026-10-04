import { confidenceLevel } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

export function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const level = confidenceLevel(confidence);
  const color = {
    high: colors.confidenceHigh,
    medium: colors.confidenceMedium,
    low: colors.confidenceLow,
  }[level];
  const label = t(`scan.confidence.${level}`);
  return (
    <View
      style={[styles.badge, { borderColor: color }]}
      accessibilityLabel={t('scan.confidence.a11y', { level: label })}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
