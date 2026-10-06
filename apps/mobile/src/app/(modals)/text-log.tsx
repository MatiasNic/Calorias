import type { IsoDate } from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, Chip, IconButton, Screen, TextField, toast } from '@/components';
import { features } from '@/config/features';
import { useScanStore } from '@/features/scan/store';
import { useAiError } from '@/features/scan/useAiError';
import { useDictation } from '@/features/scan/useDictation';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { aiAvailable, analyzeMealText } from '@/services/ai';
import { usePlan } from '@/services/purchases';
import { queryClient } from '@/services/queryClient';
import { spacing, useTheme } from '@/theme';

export default function TextLog() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aiError = useAiError();
  const params = useLocalSearchParams<{ date?: IsoDate }>();
  const quota = useQuotaStatus();
  const plan = usePlan();
  const dictation = useDictation((value) => {
    setUsedVoice(true);
    setText(value);
  });

  const analyze = async () => {
    if (aiAvailable() !== 'ok') {
      toast.info(t('profile.createAccount'));
      router.replace('/sign-up');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeMealText(text.trim(), usedVoice ? 'voice' : 'text');
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      useScanStore
        .getState()
        .setTextResult(result, usedVoice ? 'voice' : 'text', params.date ?? null);
      router.replace('/scan-review');
    } catch (e) {
      setError(aiError(e));
    } finally {
      setBusy(false);
    }
  };

  const examples = [t('textLog.example1'), t('textLog.example2'), t('textLog.example3')];
  const left = quota.data?.text_query.remaining;

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('textLog.analyze')}
          icon="sparkles"
          onPress={analyze}
          loading={busy}
          disabled={text.trim().length < 2}
          testID="text-log-analyze"
        />
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
        <AppText variant="heading">{t('textLog.title')}</AppText>
      </View>
      <AppText color="textMuted">{t('textLog.hint')}</AppText>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={t('textLog.placeholder')}
        multiline
        maxLength={500}
        style={styles.input}
        accessibilityLabel={t('textLog.title')}
        testID="text-log-input"
      />
      {features.voiceLogging ? (
        dictation.available ? (
          <Button
            label={dictation.listening ? t('textLog.stop') : t('textLog.listen')}
            icon={dictation.listening ? 'stop-circle' : 'mic'}
            variant={dictation.listening ? 'danger' : 'secondary'}
            onPress={dictation.listening ? dictation.stop : dictation.start}
          />
        ) : (
          <AppText variant="caption" color="textMuted">
            {t('textLog.voiceUnavailable')}
          </AppText>
        )
      ) : null}
      {dictation.listening ? (
        <AppText color="primary" accessibilityLiveRegion="polite">
          {t('textLog.listening')}
        </AppText>
      ) : null}
      {error ? <Banner tone="danger" message={error} /> : null}
      <AppText variant="subheading">{t('textLog.examples')}</AppText>
      <View style={styles.chips}>
        {examples.map((e) => (
          <Chip key={e} label={e} onPress={() => setText(e)} />
        ))}
      </View>
      {plan === 'free' && left != null ? (
        <AppText variant="caption" style={{ color: colors.textMuted }}>
          {t('textLog.quotaLeft', { count: left })}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { minHeight: 110, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
