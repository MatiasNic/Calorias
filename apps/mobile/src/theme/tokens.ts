/**
 * Design tokens. Screens never use raw colors/sizes: they read semantic values from the theme.
 * Macro colors are fixed across the whole app (protein, carbs, fat always look the same).
 */

export const palette = {
  mint50: '#ECFBF4',
  mint100: '#D3F5E6',
  mint300: '#7FDDB6',
  mint400: '#34D399',
  mint500: '#14B87F',
  mint600: '#0E8F67',
  mint700: '#0B6F50',
  mint900: '#06281C',
  coral400: '#FF7B6B',
  coral500: '#F0605D',
  coral600: '#C9423F',
  amber400: '#F6BC55',
  amber500: '#F2A93B',
  amber700: '#A86A0C',
  violet400: '#9A8CF7',
  violet500: '#7C6CF2',
  violet700: '#5141C9',
  sky400: '#5BB4EC',
  sky500: '#3A9BDC',
  sky700: '#1F6FA6',
  green500: '#3BB273',
  red500: '#E5484D',
  red600: '#C62F35',
  yellow500: '#E5A50A',
  white: '#FFFFFF',
  black: '#000000',
  sand50: '#F7F8F6',
  sand100: '#EFF2EF',
  sand200: '#E3E8E5',
  sand400: '#B4C0BA',
  sand600: '#5B6B63',
  ink900: '#14201B',
  night950: '#0B100E',
  night900: '#0E1412',
  night850: '#141B18',
  night800: '#17201C',
  night700: '#1F2A25',
  night600: '#2A3631',
  night400: '#6D7E76',
  night200: '#9AABA2',
  night50: '#EEF3F0',
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
  xxl: 24,
  pill: 999,
} as const;

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  heading: { fontFamily: fontFamily.semibold, fontSize: 19, lineHeight: 25 },
  subheading: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 17 },
  overline: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  number: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 26 },
} as const;
export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (iOS HIG 44pt / Material 48dp). */
export const MIN_TOUCH = 48;

export const duration = { fast: 150, normal: 250, slow: 400, ring: 900 } as const;
