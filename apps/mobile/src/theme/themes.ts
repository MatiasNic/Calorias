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
  // meal-type tints (diary icons); never used for macros
  mealBreakfast: string;
  mealLunch: string;
  mealSnack: string;
  mealDinner: string;
  mealOther: string;
  // calendar day vs goal (on target uses success)
  dayUnder: string;
  dayOver: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: palette.bgLight,
    surface: palette.s1Light,
    surfaceAlt: palette.s2Light,
    surfaceSunken: palette.s2Light,
    border: palette.lineLight,
    text: palette.inkLight,
    textMuted: palette.ink2Light,
    textSubtle: palette.ink3Light,
    textInverse: palette.s1Light,
    primary: palette.inkLight,
    primaryPressed: '#2C302E',
    primarySoft: palette.sageBgLight,
    onPrimary: palette.white,
    accent: palette.sageLight,
    danger: palette.brick600,
    dangerSoft: '#F6E4E1',
    onDanger: palette.white,
    warning: palette.warnTextLight,
    warningSoft: palette.warnBgLight,
    success: palette.sageTextLight,
    successSoft: palette.sageBgLight,
    overlay: 'rgba(0,0,0,0.45)',
    shadow: palette.black,
    kcal: palette.sageLight,
    protein: palette.proteinLight,
    carbs: palette.carbsLight,
    fat: palette.fatLight,
    fiber: palette.olive500,
    water: palette.fatLight,
    confidenceHigh: palette.sageTextLight,
    confidenceMedium: palette.warnTextLight,
    confidenceLow: palette.proteinLight,
    ringTrack: palette.s2Light,
    tabBar: 'rgba(255,255,255,0.96)',
    skeleton: palette.s2Light,
    mealBreakfast: palette.apricotLight,
    mealLunch: palette.olive500,
    mealSnack: palette.plumLight,
    mealDinner: palette.indigoLight,
    mealOther: palette.ink3Light,
    dayUnder: palette.carbsLight,
    dayOver: palette.indigoLight,
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: palette.bgDark,
    surface: palette.s1Dark,
    surfaceAlt: palette.s2Dark,
    surfaceSunken: '#161918',
    border: palette.lineDark,
    text: palette.inkDark,
    textMuted: palette.ink2Dark,
    textSubtle: palette.ink3Dark,
    textInverse: palette.bgDark,
    primary: palette.inkDark,
    primaryPressed: '#C9CEC7',
    primarySoft: palette.sageBgDark,
    onPrimary: palette.bgDark,
    accent: palette.sageDark,
    danger: palette.brick400,
    dangerSoft: '#3A2220',
    onDanger: palette.bgDark,
    warning: palette.warnTextDark,
    warningSoft: palette.warnBgDark,
    success: palette.sageDark,
    successSoft: palette.sageBgDark,
    overlay: 'rgba(0,0,0,0.45)',
    shadow: palette.black,
    kcal: palette.sageDark,
    protein: palette.proteinDark,
    carbs: palette.carbsDark,
    fat: palette.fatDark,
    fiber: palette.olive400,
    water: palette.fatDark,
    confidenceHigh: palette.sageDark,
    confidenceMedium: palette.warnTextDark,
    confidenceLow: palette.proteinDark,
    ringTrack: palette.s2Dark,
    tabBar: 'rgba(29,32,31,0.94)',
    skeleton: palette.s1Dark,
    mealBreakfast: palette.apricotDark,
    mealLunch: palette.olive400,
    mealSnack: palette.plumDark,
    mealDinner: palette.indigoDark,
    mealOther: palette.ink3Dark,
    dayUnder: palette.carbsDark,
    dayOver: palette.indigoDark,
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
