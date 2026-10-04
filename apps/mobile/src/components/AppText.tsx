import { Text, type TextProps } from 'react-native';

import { typography, useTheme, type ThemeColors, type TypographyVariant } from '@/theme';

type ColorKey = keyof ThemeColors;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorKey;
  align?: 'left' | 'center' | 'right';
  tabular?: boolean;
}

/** Themed text. Supports dynamic type up to 1.6× to keep layouts usable. */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  tabular,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        typography[variant],
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}
