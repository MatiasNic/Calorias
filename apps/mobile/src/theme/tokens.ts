/**
 * Design tokens. Screens never use raw colors/sizes: they read semantic values from the theme.
 * Macro colors are fixed across the whole app (protein, carbs, fat always look the same).
 */

export const palette = {
  ink950: '#0F1211',
  ink900: '#1B1E1C',
  ink800: '#1F2B27',
  ink700: '#34433D',
  paper50: '#F7F7F3',
  paper100: '#F2F2EE',
  paper200: '#E9E9E3',
  paper300: '#DEDED6',
  stone500: '#7A807C',
  stone600: '#5F6460',
  sage50: '#E4EAE5',
  sage300: '#B9CDBD',
  sage400: '#9DB8A4',
  sage500: '#7E9B86',
  sage700: '#4F6E58',
  clay400: '#DB9184',
  clay500: '#C7766A',
  wheat400: '#DDB873',
  wheat500: '#CFA552',
  wheat700: '#93650F',
  slate400: '#8FA6C6',
  slate500: '#6E86A8',
  olive400: '#A9B86A',
  olive500: '#8F9F4E',
  teal400: '#72BCC6',
  teal500: '#4E9BA6',
  brick400: '#E8857C',
  brick600: '#B4413A',
  white: '#FFFFFF',
  black: '#000000',
  night950: '#0D0F0E',
  night900: '#121413',
  night850: '#161918',
  night800: '#1B1E1C',
  night700: '#252927',
  night600: '#303532',
  night400: '#737A75',
  night200: '#A2A8A3',
  night50: '#ECEDE9',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 22,
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
  display: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -1.2 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.8 },
  heading: { fontFamily: fontFamily.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  subheading: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.medium, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1 },
  number: { fontFamily: fontFamily.extrabold, fontSize: 22, lineHeight: 26, letterSpacing: -0.5 },
  numberHero: { fontFamily: fontFamily.extrabold, fontSize: 64, lineHeight: 64, letterSpacing: -3 },
} as const;
export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (iOS HIG 44pt / Material 48dp). */
export const MIN_TOUCH = 48;

export const duration = { fast: 150, normal: 250, slow: 400, ring: 900 } as const;
