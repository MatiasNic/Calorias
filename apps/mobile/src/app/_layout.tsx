import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useBootstrap } from '@/hooks/useBootstrap';
import { useNotificationRouting } from '@/hooks/useNotificationRouting';
import { initI18n } from '@/i18n';
import { queryClient } from '@/services/queryClient';
import { usePrefsStore } from '@/stores/prefs';
import { AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
initI18n(usePrefsStore.getState().locale);

export { ErrorBoundary } from '@/components/ErrorBoundary';

function RootStack() {
  const theme = useTheme();
  useNotificationRouting();
  const modal = { presentation: 'modal' as const, animation: 'slide_from_bottom' as const };
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="(modals)/scan"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="(modals)/scan-review"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="(modals)/paywall" options={modal} />
        <Stack.Screen name="(modals)/food-search" options={modal} />
        <Stack.Screen name="(modals)/food-detail" options={modal} />
        <Stack.Screen name="(modals)/meal/[id]" options={modal} />
        <Stack.Screen name="(modals)/weight" options={modal} />
        <Stack.Screen name="(modals)/text-log" options={modal} />
        <Stack.Screen name="(modals)/custom-food" options={modal} />
        <Stack.Screen name="(modals)/recipe-editor" options={modal} />
        <Stack.Screen name="(modals)/coach" options={modal} />
      </Stack>
      <OfflineBanner />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const booted = useBootstrap();
  const ready = (fontsLoaded || !!fontError) && booted;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <RootStack />
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
