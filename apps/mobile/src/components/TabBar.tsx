import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MIN_TOUCH, palette, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { Icon, type IconName } from './Icon';

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  today: { on: 'calendar', off: 'calendar-outline' },
  diary: { on: 'book', off: 'book-outline' },
  progress: { on: 'trending-up', off: 'trending-up-outline' },
  profile: { on: 'person', off: 'person-outline' },
};

/** Floating tab bar (icons only): Hoy · Diario · [Escanear] · Progreso · Perfil. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: colors.tabBar }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          if (route.name === 'scan-tab') {
            return (
              <View key={route.key} style={styles.item}>
                <Pressable
                  testID="tab-scan"
                  accessibilityRole="button"
                  accessibilityLabel={t('tabs.scanA11y')}
                  onPress={() => {
                    haptic('medium');
                    router.push('/scan');
                  }}
                  style={({ pressed }) => [
                    styles.scan,
                    { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Icon name="scan-outline" size={26} rawColor={palette.ink800} />
                </Pressable>
              </View>
            );
          }
          const icon = ICONS[route.name] ?? { on: 'ellipse', off: 'ellipse-outline' };
          const label = t(`tabs.${route.name as 'today' | 'diary' | 'progress' | 'profile'}`);
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  haptic('selection');
                  navigation.navigate(route.name);
                }
              }}
              style={styles.item}
            >
              <View style={{ opacity: focused ? 1 : 0.55 }}>
                <Icon
                  name={focused ? icon.on : icon.off}
                  color={theme.dark ? (focused ? 'text' : 'textMuted') : 'onPrimary'}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xxl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: MIN_TOUCH },
  scan: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
