import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH, radii, useTheme, type ThemeColors } from '@/theme';
import { haptic } from '@/utils/haptics';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  color?: keyof ThemeColors;
  background?: keyof ThemeColors | 'transparent';
  size?: number;
  disabled?: boolean;
  testID?: string;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'text',
  background = 'transparent',
  size = 22,
  disabled,
  testID,
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={4}
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background === 'transparent' ? 'transparent' : colors[background],
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
