// design/tokens/tokens.json (the design kit) and src/theme must hold the same values: this test
// fails until both match, and its diff shows what to copy where.
import tokensJson from '../../../../../design/tokens/tokens.json';
import {
  darkTheme,
  duration,
  fontFamily,
  lightTheme,
  MIN_TOUCH,
  overlay,
  palette,
  radii,
  spacing,
  typography,
} from '@/theme';

describe('design tokens', () => {
  it('design/tokens/tokens.json matches the app theme', () => {
    const theme = {
      MIN_TOUCH,
      duration,
      fontFamily,
      palette,
      overlay,
      radii,
      spacing,
      typography,
      darkTheme,
      lightTheme,
    };
    expect(tokensJson).toEqual(JSON.parse(JSON.stringify(theme)));
  });
});
