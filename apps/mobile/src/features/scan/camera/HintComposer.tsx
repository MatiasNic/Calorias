import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { fontFamily, overlay, palette, radii, spacing } from '@/theme';

import { QUICK_HINTS } from './types';
import type { ScanHint } from './useScanHint';

/** Text/voice field for words about the photo, plus one-tap quick hints. */
export function HintComposer({ hint, setHint, addHint, dictation }: ScanHint) {
  const { t } = useTranslation();
  return (
    <>
      <View style={[styles.hintField, { backgroundColor: palette.cameraField }]}>
        <Icon name="chat_bubble" size={20} rawColor={overlay.textMuted} />
        <TextInput
          value={hint}
          onChangeText={setHint}
          placeholder={t('scan.hintPlaceholder')}
          placeholderTextColor={overlay.textMuted}
          maxLength={300}
          style={styles.hintInput}
          accessibilityLabel={t('scan.hintLabel')}
          returnKeyType="done"
          testID="scan-hint"
        />
        {dictation.available ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('scan.hintVoice')}
            onPress={dictation.listening ? dictation.stop : dictation.start}
            style={[
              styles.hintMic,
              { backgroundColor: dictation.listening ? overlay.active : palette.cameraButton },
            ]}
          >
            <Icon
              name={dictation.listening ? 'stop_circle' : 'mic'}
              size={20}
              rawColor={dictation.listening ? palette.bgDark : overlay.text}
            />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickHints}
      >
        {QUICK_HINTS.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            onPress={() => addHint(t(`scan.quickHints.${k}`))}
            style={[styles.quickHint, { backgroundColor: palette.cameraField }]}
          >
            <AppText variant="label" style={styles.cameraText}>
              + {t(`scan.quickHints.${k}`)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  cameraText: { color: overlay.textSoft },
  hintField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    borderRadius: 22,
    minHeight: 56,
  },
  hintInput: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    minHeight: 48,
    color: overlay.text,
  },
  hintMic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHints: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  quickHint: {
    height: 36,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});
