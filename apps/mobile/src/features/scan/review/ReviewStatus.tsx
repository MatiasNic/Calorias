import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, ErrorState, IconButton, Screen } from '@/components';
import { AnalyzingView } from '@/features/scan/AnalyzingView';
import { useScanStore } from '@/features/scan/store';

/** Full-screen progress while the photo is analyzed. */
export function ReviewAnalyzing({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const photoUri = useScanStore((s) => s.photo?.uri ?? null);
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={onClose} />
      <AnalyzingView uri={photoUri} />
    </Screen>
  );
}

/** The analysis failed, or the photo/text wasn't food: retry, redo the input or log by hand. */
export function ReviewFailure({
  kind,
  error,
  notes,
  onRetry,
  onClose,
}: {
  kind: 'error' | 'not_food';
  error: string | null;
  notes: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const scan = useScanStore();
  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <>
          {kind === 'error' && scan.photo ? (
            <Button label={t('common.retry')} icon="refresh" onPress={onRetry} />
          ) : null}
          {scan.source === 'photo' ? (
            <Button
              label={t('review.retake')}
              variant="outline"
              icon="camera"
              onPress={() => router.replace('/scan')}
            />
          ) : (
            <Button
              label={t('review.editText')}
              variant="outline"
              icon="create-outline"
              onPress={() =>
                router.replace({
                  pathname: '/text-log',
                  params: {
                    text: scan.inputText ?? '',
                    ...(scan.date ? { date: scan.date } : {}),
                  },
                })
              }
            />
          )}
          <Button
            label={t('review.manual')}
            variant="ghost"
            onPress={() => router.replace('/food-search')}
          />
        </>
      }
    >
      <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={onClose} />
      {kind === 'not_food' ? (
        <EmptyState
          icon="help-circle"
          title={t('review.notFoodTitle')}
          message={notes ?? t('review.notFoodBody')}
        />
      ) : (
        <ErrorState message={error ?? undefined} />
      )}
    </Screen>
  );
}
