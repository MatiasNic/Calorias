import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

const BARS = 30;
// Fixed pseudo-random shapes so the wave looks organic but renders the same every time.
const SHAPE = Array.from({ length: BARS }, (_, i) => {
  const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
  return {
    height: 18 + Math.round(r * 38),
    duration: 700 + Math.round(((i * 7) % 11) * 50),
    delay: (i * 67) % 400,
    opacity: 0.45 + ((i * 5) % 6) / 10,
  };
});

function Bar({
  index,
  active,
  volume,
}: {
  index: number;
  active: boolean;
  volume: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const shape = SHAPE[index]!;
  const t = useSharedValue(0.18);
  useEffect(() => {
    if (!active) {
      t.value = withTiming(0.18, { duration: 250 });
      return;
    }
    const ease = Easing.inOut(Easing.ease);
    t.value = withDelay(
      shape.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: shape.duration / 2, easing: ease }),
          withTiming(0.18, { duration: shape.duration / 2, easing: ease }),
        ),
        -1,
      ),
    );
  }, [active, shape, t]);
  const style = useAnimatedStyle(() => ({
    // The real microphone level makes the wave grow when the user speaks louder.
    transform: [{ scaleY: Math.max(0.12, t.value * (0.45 + 0.55 * volume.value)) }],
  }));
  return (
    <Animated.View
      style={[
        styles.bar,
        { height: shape.height, backgroundColor: colors.text, opacity: shape.opacity },
        style,
      ]}
    />
  );
}

/** Voice wave: 30 bars that breathe while listening, scaled by the microphone level. */
export function VoiceWave({ active, volume }: { active: boolean; volume: SharedValue<number> }) {
  return (
    <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no">
      {SHAPE.map((_, i) => (
        <Bar key={i} index={i} active={active} volume={volume} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 60,
  },
  bar: { width: 4, borderRadius: 2 },
});
