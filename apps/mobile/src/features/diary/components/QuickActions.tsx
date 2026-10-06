import type { IsoDate } from '@plato/shared';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, type IconName } from '@/components';
import { radii, spacing, useTheme } from '@/theme';

export function QuickActions({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const items: { icon: IconName; label: string; href: Href; testID: string }[] = [
    {
      icon: 'search-outline',
      label: t('quick.search'),
      href: { pathname: '/food-search', params: { date } },
      testID: 'quick-search',
    },
    {
      icon: 'barcode-outline',
      label: t('quick.barcode'),
      href: { pathname: '/scan', params: { mode: 'barcode' } },
      testID: 'quick-barcode',
    },
    {
      icon: 'mic-outline',
      label: t('quick.textVoice'),
      href: { pathname: '/text-log', params: { date } },
      testID: 'quick-text',
    },
    {
      icon: 'star-outline',
      label: t('quick.favorites'),
      href: { pathname: '/food-search', params: { date, tab: 'favorites' } },
      testID: 'quick-favorites',
    },
  ];
  return (
    <View style={styles.row}>
      {items.map((i) => (
        <Pressable
          key={i.label}
          testID={i.testID}
          accessibilityRole="button"
          accessibilityLabel={i.label}
          onPress={() => router.push(i.href)}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
          ]}
        >
          <Icon name={i.icon} color="text" />
          <AppText variant="caption" align="center" numberOfLines={1}>
            {i.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.xl,
    minHeight: 64,
  },
});
