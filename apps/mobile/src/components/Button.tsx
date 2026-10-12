import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { fontFamily, MIN_TOUCH, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  loading,
  fullWidth = true,
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const palette = {
    primary: {
      bg: colors.primary,
      pressed: colors.primaryPressed,
      fg: 'onPrimary' as const,
      border: 'transparent',
    },
    secondary: {
      bg: colors.surfaceAlt,
      pressed: colors.border,
      fg: 'text' as const,
      border: 'transparent',
    },
    ghost: {
      bg: 'transparent',
      pressed: colors.surfaceAlt,
      fg: 'textMuted' as const,
      border: 'transparent',
    },
    outline: {
      bg: 'transparent',
      pressed: colors.surfaceAlt,
      fg: 'text' as const,
      border: colors.border,
    },
    danger: {
      bg: colors.danger,
      pressed: colors.danger,
      fg: 'onDanger' as const,
      border: 'transparent',
    },
  }[variant];
  const height = size === 'lg' ? 56 : size === 'md' ? MIN_TOUCH : 40;
  // Disabled primary buttons turn flat (design: s2 background, ink3 text) instead of fading.
  const flatDisabled = isDisabled && !loading && variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? 6 : 0}
      onPress={(e) => {
        haptic('light');
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: flatDisabled
            ? colors.surfaceAlt
            : pressed
              ? palette.pressed
              : palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: isDisabled && !flatDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[palette.fg]} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Icon
              name={icon}
              size={size === 'sm' ? 18 : 20}
              color={flatDisabled ? 'textSubtle' : palette.fg}
            />
          ) : null}
          <AppText
            variant={size === 'sm' ? 'label' : 'bodyStrong'}
            color={flatDisabled ? 'textSubtle' : palette.fg}
            style={size === 'sm' ? undefined : styles.strong}
            numberOfLines={1}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  strong: { fontFamily: fontFamily.extrabold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
