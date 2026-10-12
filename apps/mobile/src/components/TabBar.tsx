import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { AppText } from './AppText';
import { Icon, type SymbolName } from './Icon';

const ICONS: Record<string, SymbolName> = {
  today: 'today',
  diary: 'calendar_month',
  progress: 'trending_up',
  profile: 'person',
};

/**
 * Floating tab bar: Hoy · Diario · [micrófono] · Progreso · Perfil. The central button always
 * opens "Escuchando" (voice logging), the app's main action.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]}
    >
      <View style={[styles.bar, { backgroundColor: colors.tabBar, borderColor: colors.border }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          if (route.name === 'scan-tab') {
            return (
              <View key={route.key} style={styles.item}>
                <Pressable
                  testID="tab-voice"
                  accessibilityRole="button"
                  accessibilityLabel={t('tabs.voiceA11y')}
                  onPress={() => {
                    haptic('medium');
                    router.push('/listen');
                  }}
                  style={({ pressed }) => [
                    styles.mic,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Icon name="mic" size={28} color="onPrimary" />
                </Pressable>
              </View>
            );
          }
          const label = t(`tabs.${route.name as 'today' | 'diary' | 'progress' | 'profile'}`);
          const tint = focused ? 'text' : 'textSubtle';
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
              <Icon name={ICONS[route.name] ?? 'today'} size={24} color={tint} />
              <AppText variant="caption" color={tint} style={styles.label} numberOfLines={1}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    borderRadius: radii.xxxl,
    borderWidth: 1,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 64 },
  label: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.bold },
  mic: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
