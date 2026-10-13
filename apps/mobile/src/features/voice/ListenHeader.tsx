import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, IconButton } from '@/components';
import { currentLocale } from '@/i18n';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

import { Blink } from './ListenAnimations';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Close button, "Escuchando · 0:12" status and the dictation language. */
export function ListenHeader({
  listening,
  seconds,
  onCancel,
}: {
  listening: boolean;
  seconds: number;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = currentLocale().replace('-', ' · ').toUpperCase();
  return (
    <View style={styles.header}>
      <IconButton icon="close" accessibilityLabel={t('common.cancel')} onPress={onCancel} />
      <View style={styles.status} accessibilityLiveRegion="polite">
        {listening ? (
          <Blink period={1200}>
            <View style={[styles.dot, { backgroundColor: colors.protein }]} />
          </Blink>
        ) : null}
        <AppText variant="bodyStrong">
          {listening ? t('listen.listening') : t('listen.paused')}
        </AppText>
        <AppText variant="bodyStrong" color="textSubtle" tabular>
          {fmt(seconds)}
        </AppText>
      </View>
      <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
        <AppText variant="caption" style={styles.pillText}>
          {locale}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  status: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pill: {
    height: 32,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  pillText: { fontFamily: fontFamily.bold, fontSize: 12 },
});
