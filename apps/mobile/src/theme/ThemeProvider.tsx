import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { usePrefsStore } from '@/stores/prefs';
import { darkTheme, lightTheme, type Theme } from './themes';

const ThemeContext = createContext<Theme>(lightTheme);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const preference = usePrefsStore((s) => s.theme);
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
