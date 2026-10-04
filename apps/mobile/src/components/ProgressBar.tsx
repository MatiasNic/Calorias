import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { radii, useTheme } from '@/theme';

export function ProgressBar({ progress, label }: { progress: number; label?: string }) {
  const { colors } = useTheme();
  const v = useSharedValue(progress);
  useEffect(() => {
    v.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 300 });
  }, [progress, v]);
  const style = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { backgroundColor: colors.ringTrack }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
