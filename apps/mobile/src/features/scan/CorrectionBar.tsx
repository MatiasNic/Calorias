import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, IconButton, TextField } from '@/components';
import { features } from '@/config/features';
import { radii, spacing, useTheme } from '@/theme';
import { useDictation } from './useDictation';

/**
 * "¿Algo no está bien? Decilo": a spoken or typed correction of the whole meal
 * ("era al horno y sin puré", "la mitad de fideos", "agregá una coca").
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

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]}>
      <AppText variant="label">{t('review.correctTitle')}</AppText>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            value={text}
            onChangeText={setText}
            placeholder={
              dictation.listening ? t('textLog.listening') : t('review.correctPlaceholder')
            }
            multiline
            maxLength={500}
            accessibilityLabel={t('review.correctTitle')}
            testID="review-correct-input"
          />
        </View>
        {canDictate ? (
          <IconButton
            icon={dictation.listening ? 'stop-circle' : 'mic'}
            accessibilityLabel={dictation.listening ? t('textLog.stop') : t('textLog.listen')}
            background={dictation.listening ? 'danger' : 'surface'}
            color={dictation.listening ? 'onPrimary' : 'text'}
            square
            onPress={dictation.listening ? dictation.stop : dictation.start}
            testID="review-correct-mic"
          />
        ) : null}
        <IconButton
          icon="arrow-up"
          accessibilityLabel={t('review.correctSend')}
          background="primary"
          color="onPrimary"
          square
          disabled={busy || text.trim().length < 2}
          loading={busy}
          onPress={send}
          testID="review-correct-send"
        />
      </View>
      {error ? <Banner tone="danger" message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1 },
});
