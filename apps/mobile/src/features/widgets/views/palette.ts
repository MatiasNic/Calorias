import type { HexColor } from 'react-native-android-widget';

/**
 * Widget colors for the launcher. Widgets are drawn outside React (no theme context), so they
 * use their own DARK/LIGHT palette; the values mirror the `src/theme` tokens
 * (`design/tokens/tokens.json`) and must be kept in sync by hand.
 */
export interface Palette {
  bg: HexColor;
  s2: HexColor;
  ink: HexColor;
  ink2: HexColor;
  inv: HexColor;
  sage: HexColor;
  water: HexColor;
  p: HexColor;
  c: HexColor;
  f: HexColor;
}

export const DARK: Palette = {
  bg: '#1B1E1D',
  s2: '#272B29',
  ink: '#ECEEE9',
  ink2: '#A9AFAB',
  inv: '#111312',
  sage: '#AFCBB3',
  water: '#95AACD',
  p: '#E6927F',
  c: '#E5C070',
  f: '#95AACD',
};
export const LIGHT: Palette = {
  bg: '#FFFFFF',
  s2: '#EAE9E3',
  ink: '#161918',
  ink2: '#565D59',
  inv: '#FFFFFF',
  sage: '#9CC0A3',
  water: '#5A76A6',
  p: '#C5604D',
  c: '#B3831C',
  f: '#5A76A6',
};
