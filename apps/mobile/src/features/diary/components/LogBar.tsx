import type { IsoDate } from '@bocado/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { features } from '@/config/features';
import { radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';

/**
 * "¿Qué comiste?": the main way to log. The mic opens "Escuchando", the camera takes a photo and
 * the text side opens the keyboard. One step from Today to the review.
 */
export function LogBar({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID="log-bar"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('logBar.type')}
        onPress={() => router.push({ pathname: '/text-log', params: { date } })}
        style={styles.main}
        testID="log-bar-text"
      >
        <AppText variant="heading">{t('logBar.title')}</AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {t('logBar.hint')}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('logBar.photo')}
        onPress={() => router.push('/scan')}
        style={[styles.camera, { backgroundColor: colors.surfaceAlt }]}
        testID="log-bar-photo"
      >
        <Icon name="photo_camera" size={22} />
      </Pressable>
      {features.voiceLogging ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('logBar.voice')}
          onPress={() => {
            haptic('medium');
            router.push({ pathname: '/listen', params: { date } });
          }}
          style={({ pressed }) => [
            styles.mic,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="log-bar-voice"
        >
          <Icon name="mic" size={30} color="onPrimary" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: 30,
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  main: { flex: 1, minHeight: 48, justifyContent: 'center', gap: 2 },
  camera: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
