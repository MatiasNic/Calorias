import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Vector logo: a plate seen from above with a leaf (placeholder brand mark, see docs/RELEASE.md). */
export function AppLogo({ size = 72 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Plato">
      <Circle cx="50" cy="50" r="48" fill={colors.primary} />
      <Circle cx="50" cy="50" r="34" fill={colors.surface} />
      <Circle cx="50" cy="50" r="26" fill="none" stroke={colors.primarySoft} strokeWidth="3" />
      <Path d="M50 30 C 64 36, 66 54, 50 70 C 34 54, 36 36, 50 30 Z" fill={colors.kcal} />
      <Path d="M50 36 L 50 64" stroke={colors.surface} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}
