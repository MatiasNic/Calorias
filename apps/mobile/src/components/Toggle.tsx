import { useEffect } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';

export interface ToggleProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** On/off switch (design: 52×32 pill; on = ink track, off = s2 track). Replaces RN Switch. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
  style,
  testID,
}: ToggleProps) {
  const { colors } = useTheme();
  const x = useSharedValue(value ? 20 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 20 : 0, { duration: 180 });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic('selection');
        onValueChange?.(!value);
      }}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.primary : colors.surfaceAlt,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.knob,
          { backgroundColor: value ? colors.background : colors.textSubtle },
          knob,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 32, borderRadius: 999, justifyContent: 'center' },
  knob: { position: 'absolute', left: 4, width: 24, height: 24, borderRadius: 12 },
});
