import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MIN_TOUCH, shadow, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  today: { on: 'home', off: 'home-outline' },
  diary: { on: 'book', off: 'book-outline' },
  progress: { on: 'stats-chart', off: 'stats-chart-outline' },
  profile: { on: 'person', off: 'person-outline' },
};

/** Custom tab bar: Hoy · Diario · [Escanear] · Progreso · Perfil. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
      ]}
    >
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
                  shadow(theme, 3),
                  { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
                ]}
              >
                <Icon name="scan" size={30} color="onPrimary" />
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
            <Icon name={focused ? icon.on : icon.off} color={focused ? 'primary' : 'textMuted'} />
            <AppText
              variant="caption"
              color={focused ? 'primary' : 'textMuted'}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.xs },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: MIN_TOUCH, gap: 2 },
  scan: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
});
