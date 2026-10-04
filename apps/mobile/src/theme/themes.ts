import { palette } from './tokens';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  overlay: string;
  shadow: string;
  // fixed macro colors
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  water: string;
  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;
  ringTrack: string;
  tabBar: string;
  skeleton: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: palette.sand50,
    surface: palette.white,
    surfaceAlt: palette.sand100,
    surfaceSunken: palette.sand100,
    border: palette.sand200,
    text: palette.ink900,
    textMuted: palette.sand600,
    textSubtle: '#7A8981',
    textInverse: palette.white,
    primary: palette.mint600,
    primaryPressed: palette.mint700,
    primarySoft: palette.mint50,
    onPrimary: palette.white,
    accent: palette.coral500,
    danger: palette.red600,
    dangerSoft: '#FDECEC',
    onDanger: palette.white,
    warning: palette.amber700,
    warningSoft: '#FFF5E0',
    success: palette.mint600,
    successSoft: palette.mint50,
    overlay: 'rgba(10,20,15,0.45)',
    shadow: '#0B2A1E',
    kcal: palette.mint500,
    protein: palette.coral500,
    carbs: palette.amber500,
    fat: palette.violet500,
    fiber: palette.green500,
    water: palette.sky500,
    confidenceHigh: palette.mint600,
    confidenceMedium: palette.amber700,
    confidenceLow: palette.red600,
    ringTrack: palette.sand200,
    tabBar: palette.white,
    skeleton: palette.sand200,
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: palette.night900,
    surface: palette.night800,
    surfaceAlt: palette.night700,
    surfaceSunken: palette.night850,
    border: palette.night600,
    text: palette.night50,
    textMuted: palette.night200,
    textSubtle: palette.night400,
    textInverse: palette.ink900,
    primary: palette.mint400,
    primaryPressed: palette.mint300,
    primarySoft: '#13372A',
    onPrimary: palette.mint900,
    accent: palette.coral400,
    danger: '#FF6B70',
    dangerSoft: '#3A1D1F',
    onDanger: palette.night950,
    warning: palette.amber400,
    warningSoft: '#3A2E16',
    success: palette.mint400,
    successSoft: '#13372A',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: palette.black,
    kcal: palette.mint400,
    protein: palette.coral400,
    carbs: palette.amber400,
    fat: palette.violet400,
    fiber: palette.green500,
    water: palette.sky400,
    confidenceHigh: palette.mint400,
    confidenceMedium: palette.amber400,
    confidenceLow: '#FF6B70',
    ringTrack: palette.night600,
    tabBar: palette.night850,
    skeleton: palette.night700,
  },
};

export function shadow(theme: Theme, level: 1 | 2 | 3 = 1) {
  const opacity = theme.dark ? 0.4 : [0.06, 0.09, 0.14][level - 1];
  return {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: level * 2 },
    shadowOpacity: opacity,
    shadowRadius: level * 6,
    elevation: level * 2,
  };
}
