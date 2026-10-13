/**
 * Design tokens. Screens never use raw colors/sizes: they read semantic values from the theme.
 * Macro colors are fixed across the whole app (protein, carbs, fat always look the same).
 */

export const palette = {
  // Voice-first redesign (design/handoff-v0.3). Dark first, light mirrors it.
  bgDark: '#111312',
  s1Dark: '#1B1E1D',
  s2Dark: '#272B29',
  lineDark: '#2B302D',
  inkDark: '#ECEEE9',
  ink2Dark: '#A9AFAB',
  ink3Dark: '#7C837F',
  sageDark: '#AFCBB3',
  sageBgDark: '#1E2A22',
  proteinDark: '#E6927F',
  carbsDark: '#E5C070',
  fatDark: '#95AACD',
  warnBgDark: '#2F271A',
  warnTextDark: '#E9C47A',
  bgLight: '#F4F3EE',
  s1Light: '#FFFFFF',
  s2Light: '#EAE9E3',
  lineLight: '#E1DFD7',
  inkLight: '#161918',
  ink2Light: '#565D59',
  ink3Light: '#7E8580',
  sageLight: '#9CC0A3',
  sageTextLight: '#3B6A47',
  sageBgLight: '#E2EDE3',
  proteinLight: '#C5604D',
  carbsLight: '#B3831C',
  fatLight: '#5A76A6',
  warnBgLight: '#F4E8CF',
  warnTextLight: '#6B4C0F',
  brick400: '#E8857C',
  brick600: '#B4413A',
  olive400: '#A9B86A',
  olive500: '#8F9F4E',
  apricotLight: '#C7722E',
  apricotDark: '#EBA66B',
  plumLight: '#A0598A',
  plumDark: '#D59AC3',
  indigoLight: '#5E62A8',
  indigoDark: '#A3A6DE',
  // Camera UI is always dark, whatever the theme.
  cameraSheet: '#151716',
  cameraField: '#232726',
  cameraButton: '#2E3331',
  white: '#FFFFFF',
  black: '#000000',
  // Legacy names still used by the brand assets and a few illustrations.
  ink800: '#1F2B27',
  night900: '#121413',
  paper100: '#F2F2EE',
} as const;

/**
 * Camera and photo overlays: always drawn over a live (dark) image, whatever the app theme.
 */
export const overlay = {
  background: '#000000',
  text: '#FFFFFF',
  textSoft: '#E5E7E3',
  textMuted: '#C9CDCA',
  active: '#ECEEE9',
  control: 'rgba(255,255,255,0.12)',
  shadow: '#000000',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  sheet: 32,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 36, lineHeight: 38, letterSpacing: -1.26 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
  heading: { fontFamily: fontFamily.extrabold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  subheading: { fontFamily: fontFamily.extrabold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fontFamily.extrabold, fontSize: 12, lineHeight: 16, letterSpacing: 1 },
  number: { fontFamily: fontFamily.extrabold, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  numberHero: {
    fontFamily: fontFamily.extrabold,
    fontSize: 76,
    lineHeight: 70,
    letterSpacing: -3.8,
  },
} as const;
export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (iOS HIG 44pt / Material 48dp). */
export const MIN_TOUCH = 48;

export const duration = { fast: 150, normal: 250, slow: 400, ring: 900 } as const;
