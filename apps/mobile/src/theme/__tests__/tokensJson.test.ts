// design/tokens/tokens.json (the design kit) and src/theme must hold the same values: this test
// fails until both match. When the design kit changes, port the values to src/theme; when the
// theme changes, regenerate the JSON with:
//   UPDATE_TOKENS=1 pnpm --filter @plato/mobile exec jest tokensJson && pnpm prettier --write design/tokens
import * as fs from 'fs';
import * as path from 'path';

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

const file = path.join(__dirname, '../../../../../design/tokens/tokens.json');
const tokens = JSON.parse(
  JSON.stringify({
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
  }),
);

describe('design tokens', () => {
  it('design/tokens/tokens.json matches the app theme', () => {
    if (process.env.UPDATE_TOKENS) fs.writeFileSync(file, `${JSON.stringify(tokens, null, 2)}\n`);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(tokens);
  });
});
