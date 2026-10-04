import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { radii, shadow, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

type ToastTone = 'success' | 'error' | 'info';
interface ToastState {
  message: string | null;
  tone: ToastTone;
  id: number;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'info',
  id: 0,
  show: (message, tone = 'info') => set((s) => ({ message, tone, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().show(m, 'success'),
  error: (m: string) => useToastStore.getState().show(m, 'error'),
  info: (m: string) => useToastStore.getState().show(m, 'info'),
};

export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { message, tone, id, hide } = useToastStore();
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 2800);
    return () => clearTimeout(timer);
  }, [message, id, hide]);
  if (!message) return null;
  const icon =
    tone === 'success'
      ? 'checkmark-circle'
      : tone === 'error'
        ? 'alert-circle'
        : 'information-circle';
  const color = tone === 'success' ? 'success' : tone === 'error' ? 'danger' : 'primary';
  return (
    <Animated.View
      key={id}
      entering={FadeInUp}
      exiting={FadeOutUp}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        shadow(theme, 3),
        {
          top: insets.top + spacing.sm,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Icon name={icon} color={color} />
      <AppText variant="label" style={styles.text}>
        {message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    zIndex: 1000,
  },
  text: { flex: 1 },
});
