import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { fontFamily, spacing, useTheme } from '@/theme';

import { PulseRing } from './ListenAnimations';

/** "Escribir" · "Listo" · "De nuevo" buttons at the bottom of the listen screen. */
export function ListenControls({
  listening,
  onWrite,
  onDone,
  onAgain,
}: {
  listening: boolean;
  onWrite: () => void;
  onDone: () => void;
  onAgain: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.controls}>
      <View style={styles.control}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('listen.write')}
          onPress={onWrite}
          style={[styles.small, { backgroundColor: colors.surfaceAlt }]}
          testID="listen-write"
        >
          <Icon name="edit" size={26} />
        </Pressable>
        <AppText variant="caption" color="textMuted" style={styles.controlLabel}>
          {t('listen.write')}
        </AppText>
      </View>
      <View style={styles.control}>
        <View style={styles.doneWrap}>
          {listening ? <PulseRing /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listen.done')}
            onPress={onDone}
            style={[styles.done, { backgroundColor: colors.primary }]}
            testID="listen-done"
          >
            <Icon name="check" size={34} color="onPrimary" />
          </Pressable>
        </View>
        <AppText variant="caption" color="textMuted" style={styles.controlLabel}>
          {t('listen.done')}
        </AppText>
      </View>
      <View style={styles.control}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('listen.again')}
          onPress={onAgain}
          style={[styles.small, { backgroundColor: colors.surfaceAlt }]}
          testID="listen-again"
        >
          <Icon name="restart_alt" size={26} />
        </Pressable>
        <AppText variant="caption" color="textMuted" style={styles.controlLabel}>
          {t('listen.again')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  control: { alignItems: 'center', gap: spacing.xs, minWidth: 84 },
  controlLabel: { fontFamily: fontFamily.bold, fontSize: 12 },
  small: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  doneWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  done: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
});
