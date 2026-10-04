import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { radii, shadow, spacing, useTheme } from '@/theme';

export interface CardProps extends ViewProps {
  padded?: boolean;
  elevated?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
}

export function Card({
  padded = true,
  elevated = true,
  onPress,
  style,
  children,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const base = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: theme.dark ? 1 : 0,
      padding: padded ? spacing.lg : 0,
    },
    elevated ? shadow(theme, 1) : null,
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [...base, pressed ? { opacity: 0.85 } : null]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl },
});
