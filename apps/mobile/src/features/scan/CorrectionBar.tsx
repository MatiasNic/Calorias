import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { features } from '@/config/features';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { useDictation } from './useDictation';

/**
 * "¿Algo no está bien? Decilo": a spoken or typed correction of the whole meal
 * ("era al horno y sin puré", "la mitad de fideos", "agregá una coca"). The round button is the
 * microphone while the field is empty and "send" once there is text.
 */
export function CorrectionBar({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (text: string, source: 'text' | 'voice') => Promise<boolean>;
  busy: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);
  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const dictation = useDictation(
    () => textRef.current,
    (value) => {
      setUsedVoice(true);
      setText(value);
    },
  );

  const send = async () => {
    if (dictation.listening) dictation.stop();
    const ok = await onSubmit(text, usedVoice ? 'voice' : 'text');
    if (ok) {
      setText('');
      setUsedVoice(false);
    }
  };

  const canDictate = features.voiceLogging && dictation.available;
  const hasText = text.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={dictation.listening ? t('listen.listening') : t('review.correctTitle')}
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={500}
          style={[styles.input, { color: colors.text }]}
          accessibilityLabel={t('review.correctTitle')}
          testID="review-correct-input"
        />
        {busy ? (
          <View style={[styles.button, { backgroundColor: colors.surfaceAlt }]}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : hasText ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('review.correctSend')}
            onPress={send}
            style={[styles.button, { backgroundColor: colors.primary }]}
            testID="review-correct-send"
          >
            <Icon name="arrow_upward" size={22} color="onPrimary" />
          </Pressable>
        ) : canDictate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dictation.listening ? t('textLog.stop') : t('review.correctVoice')}
            onPress={dictation.listening ? dictation.stop : dictation.start}
            style={[
              styles.button,
              { backgroundColor: dictation.listening ? colors.primary : colors.surfaceAlt },
            ]}
            testID="review-correct-mic"
          >
            <Icon
              name={dictation.listening ? 'stop_circle' : 'mic'}
              size={22}
              color={dictation.listening ? 'onPrimary' : 'text'}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 26,
    paddingVertical: 5,
    paddingRight: 5,
    paddingLeft: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 110,
    paddingVertical: spacing.sm,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
