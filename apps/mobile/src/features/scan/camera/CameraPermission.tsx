import type { IsoDate } from '@plato/shared';
import type { PermissionResponse } from 'expo-camera';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Icon, IconButton } from '@/components';
import { radii, spacing, useTheme } from '@/theme';

/** Shown instead of the camera until the user grants (or is sent to settings for) access. */
export function CameraPermission({
  permission,
  requestPermission,
  entryDate,
}: {
  permission: PermissionResponse;
  requestPermission: () => unknown;
  entryDate: IsoDate;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <IconButton
        icon="close"
        accessibilityLabel={t('common.close')}
        onPress={() => router.back()}
      />
      <View style={styles.permission}>
        <View style={[styles.permissionIcon, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name="camera-outline" size={28} color="text" />
        </View>
        <AppText variant="title">{t('scan.permissionTitle')}</AppText>
        <AppText color="textMuted">{t('scan.permissionBody')}</AppText>
      </View>
      <View style={styles.permissionActions}>
        <Button
          label={permission.canAskAgain ? t('scan.permissionCta') : t('scan.openSettings')}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        />
        <Button
          label={t('scan.textInstead')}
          variant="ghost"
          size="md"
          onPress={() => router.replace({ pathname: '/text-log', params: { date: entryDate } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  permission: { flex: 1, justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  permissionIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionActions: { padding: spacing.lg, gap: spacing.xs },
});
