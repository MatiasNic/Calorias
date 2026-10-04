import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useSyncStatus } from '@/services/sync/engine';
import { radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function OfflineBanner() {
  const online = useSyncStatus((s) => s.online);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { bottom: insets.bottom + 90, backgroundColor: colors.text }]}
    >
      <Icon name="cloud-offline" size={16} rawColor={colors.background} />
      <AppText variant="caption" style={{ color: colors.background, flex: 1 }}>
        {t('common.offline')}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
  },
});
