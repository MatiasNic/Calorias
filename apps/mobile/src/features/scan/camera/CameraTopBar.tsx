import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, IconButton } from '@/components';
import { overlay, radii, spacing } from '@/theme';

/** Close button, remaining photo-scan quota and torch toggle over the camera. */
export function CameraTopBar({
  quotaLabel,
  torch,
  onToggleTorch,
}: {
  /** Quota pill text, or null to hide it. */
  quotaLabel: string | null;
  torch: boolean;
  onToggleTorch: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.top}>
      <IconButton
        icon="close"
        rawWhite
        accessibilityLabel={t('common.close')}
        onPress={() => router.back()}
      />
      {quotaLabel ? (
        <View style={styles.pill}>
          <AppText variant="caption" style={styles.white}>
            {quotaLabel}
          </AppText>
        </View>
      ) : null}
      <IconButton
        icon={torch ? 'flash' : 'flash-off'}
        rawWhite
        accessibilityLabel={torch ? t('scan.flashOff') : t('scan.flashOn')}
        onPress={onToggleTorch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  pill: {
    backgroundColor: overlay.control,
    paddingHorizontal: spacing.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  white: { color: overlay.text },
});
