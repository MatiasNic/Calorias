import { useId } from 'react';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

/** Bocado isotype: a plate seen from above with a bite taken out (see marca/logo-isotipo.svg). */
export function AppLogo({ size = 48 }: { size?: number }) {
  const theme = useTheme();
  const maskId = `bite-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fill = theme.dark ? theme.colors.accent : theme.colors.primary;
  return (
    <Svg width={size} height={size} viewBox="4 8 48 48" accessibilityLabel="Bocado">
      <Defs>
        <Mask id={maskId}>
          <Rect x="0" y="0" width="60" height="60" fill="#fff" />
          <Circle cx="49" cy="14" r="12" fill="#000" />
        </Mask>
      </Defs>
      <Circle cx="28" cy="32" r="22" fill={fill} mask={`url(#${maskId})`} />
    </Svg>
  );
}
