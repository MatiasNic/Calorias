import type { IsoDate } from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, IconButton, Screen, toast } from '@/components';
import { AnalyzingView } from '@/features/scan/AnalyzingView';
import { useScanStore } from '@/features/scan/store';
import { useAiError } from '@/features/scan/useAiError';
import { aiAvailable, analyzeMealText } from '@/services/ai';
import { track } from '@/services/analytics';
import { queryClient } from '@/services/queryClient';
import { spacing } from '@/theme';

/** Shown at least this long, so the steps read as progress instead of a flash. */
const MIN_MS = 1400;

/**
 * "Analizando…" for spoken and typed meals: sends the text, then opens the review.
 * Errors stay here with "Reintentar" and "Editar el texto".
 */
export default function Analyzing() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    text: string;
    source?: 'voice' | 'text';
    date?: IsoDate;
  }>();
  const text = (params.text ?? '').trim();
  const source = params.source === 'voice' ? 'voice' : 'text';
  const aiError = useAiError();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (aiAvailable() !== 'ok') {
      toast.info(t('profile.createAccount'));
      router.replace('/sign-up');
      return;
    }
    const t0 = Date.now();
    analyzeMealText(text, source)
      .then(async (result) => {
        const wait = MIN_MS - (Date.now() - t0);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled.current) return;
        queryClient.invalidateQueries({ queryKey: ['quota'] });
        track('scan_completed', { ms: Date.now() - t0, items: result.items.length, cached: false });
        useScanStore.getState().setTextResult(result, source, params.date ?? null, text);
        router.replace('/scan-review');
      })
      .catch((e: unknown) => {
        if (cancelled.current) return;
        track('scan_failed');
        setError(aiError(e));
      });
    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const edit = () =>
    router.replace({
      pathname: '/text-log',
      params: { text, ...(params.date ? { date: params.date } : {}) },
    });

  if (error) {
    return (
      <Screen
        edges={['top', 'bottom', 'left', 'right']}
        footer={
          <>
            <Button
              label={t('common.retry')}
              icon="refresh"
              onPress={() => {
                setError(null);
                setAttempt((a) => a + 1);
              }}
            />
            <Button label={t('review.editText')} variant="secondary" icon="edit" onPress={edit} />
          </>
        }
      >
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={router.back} />
        <ErrorState message={error} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} scroll={false}>
      <View style={styles.wrap}>
        <AnalyzingView quote={text} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ wrap: { paddingTop: spacing.md } });
