import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useTheme, type ThemeColors } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: keyof ThemeColors;
  rawColor?: string;
}

export function Icon({ name, size = 22, color = 'text', rawColor }: IconProps) {
  const theme = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={rawColor ?? theme.colors[color]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
