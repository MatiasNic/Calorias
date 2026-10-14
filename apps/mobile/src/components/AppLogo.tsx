import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/**
 * Bocado symbol: a plate with a big bite and four tooth marks (design/marca, handoff "marca").
 * Always this exact path — never redrawn as two overlapping circles.
 */
export const BOCADO_SYMBOL_PATH =
  'M52.50 0.06A50 50 0 1 0 99.94 47.50A11.07 11.07 0 0 1 80.76 45.74A11.07 11.07 0 0 1 64.39 35.61A11.07 11.07 0 0 1 54.26 19.24A11.07 11.07 0 0 1 52.50 0.06Z';

export function AppLogo({ size = 48, color }: { size?: number; color?: string }) {
  const theme = useTheme();
  // Sage on paper and on dark (the dark theme's accent is the lighter sage #AFCBB3).
  const fill = color ?? theme.colors.accent;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Bocado">
      <Path d={BOCADO_SYMBOL_PATH} fill={fill} />
    </Svg>
  );
}
