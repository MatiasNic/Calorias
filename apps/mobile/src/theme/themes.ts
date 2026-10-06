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
    background: palette.paper100,
    surface: palette.white,
    surfaceAlt: palette.paper200,
    surfaceSunken: '#ECECE6',
    border: palette.paper300,
    text: palette.ink900,
    textMuted: palette.stone600,
    textSubtle: palette.stone500,
    textInverse: palette.white,
    primary: palette.ink800,
    primaryPressed: palette.ink700,
    primarySoft: palette.sage50,
    onPrimary: palette.white,
    accent: palette.sage300,
    danger: palette.brick600,
    dangerSoft: '#F6E4E1',
    onDanger: palette.white,
    warning: palette.wheat700,
    warningSoft: '#F5EDDA',
    success: palette.sage700,
    successSoft: palette.sage50,
    overlay: 'rgba(15,18,17,0.45)',
    shadow: palette.ink900,
    kcal: palette.sage500,
    protein: palette.clay500,
    carbs: palette.wheat500,
    fat: palette.slate500,
    fiber: palette.olive500,
    water: palette.teal500,
    confidenceHigh: palette.sage700,
    confidenceMedium: palette.wheat700,
    confidenceLow: palette.brick600,
    ringTrack: '#E1E2DB',
    tabBar: palette.ink800,
    skeleton: '#E4E4DE',
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
    textInverse: palette.night800,
    primary: '#E9ECE6',
    primaryPressed: '#C9CEC7',
    primarySoft: '#263029',
    onPrimary: palette.night900,
    accent: palette.sage300,
    danger: palette.brick400,
    dangerSoft: '#3A2220',
    onDanger: palette.night900,
    warning: palette.wheat400,
    warningSoft: '#33291A',
    success: palette.sage400,
    successSoft: '#263029',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: palette.black,
    kcal: palette.sage400,
    protein: palette.clay400,
    carbs: palette.wheat400,
    fat: palette.slate400,
    fiber: palette.olive400,
    water: palette.teal400,
    confidenceHigh: palette.sage400,
    confidenceMedium: palette.wheat400,
    confidenceLow: palette.brick400,
    ringTrack: '#2A2E2C',
    tabBar: palette.night700,
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
