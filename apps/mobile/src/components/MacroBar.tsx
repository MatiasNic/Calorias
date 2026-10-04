import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
  compact?: boolean;
  /** Label above value (for narrow side-by-side layouts). */
  stacked?: boolean;
}

export function MacroBar({
  label,
  value,
  target,
  color,
  unit = 'g',
  compact,
  stacked,
}: MacroBarProps) {
  const { colors } = useTheme();
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(ratio, { duration: 700 });
  }, [ratio, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${Math.round(value)} ${unit} / ${Math.round(target)} ${unit}`}
    >
      <View style={stacked ? styles.stackedHeader : styles.header}>
        <AppText variant={compact ? 'caption' : 'label'} color="textMuted" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant={compact || stacked ? 'caption' : 'label'} tabular numberOfLines={1}>
          {Math.round(value)}
          <AppText variant="caption" color="textMuted">
            {' '}
            / {Math.round(target)} {unit}
          </AppText>
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.ringTrack, height: compact ? 6 : 8 }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, flex: 1 },
  stackedHeader: { gap: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  track: { borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
