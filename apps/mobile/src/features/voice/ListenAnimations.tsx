import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

/** Fades its children in and out forever (the "recording" dot). */
export function Blink({ children, period }: { children: React.ReactNode; period: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: period / 2 }),
        withTiming(1, { duration: period / 2 }),
      ),
      -1,
    );
  }, [o, period]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Expanding ring around the "Listo" button while listening. */
export function PulseRing() {
  const { colors } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1);
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 * (1 - p.value),
    transform: [{ scale: 1 + 0.55 * p.value }],
  }));
  return <Animated.View style={[styles.ring, { borderColor: colors.text }, style]} />;
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
  },
});
