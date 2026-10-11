import type { IsoDate } from '@plato/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, IconButton } from '@/components';
import { features } from '@/config/features';
import { radii, spacing, useTheme } from '@/theme';

/**
 * "¿Qué comiste?": the main way to log. The mic opens the dictation already listening, the
 * camera takes a photo and the bar itself opens the keyboard. One step from Today to the review.
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
        <AppText variant="bodyStrong">{t('logBar.title')}</AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {t('logBar.hint')}
        </AppText>
      </Pressable>
      <IconButton
        icon="camera-outline"
        accessibilityLabel={t('logBar.photo')}
        background="surfaceAlt"
        onPress={() => router.push('/scan')}
        testID="log-bar-photo"
      />
      {features.voiceLogging ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('logBar.voice')}
          onPress={() => router.push({ pathname: '/text-log', params: { date, voice: '1' } })}
          style={[styles.mic, { backgroundColor: colors.primary }]}
          testID="log-bar-voice"
        >
          <Icon name="mic" size={26} color="onPrimary" />
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
    borderRadius: radii.xxl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
  },
  main: { flex: 1, minHeight: 48, justifyContent: 'center', gap: 2 },
  mic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
