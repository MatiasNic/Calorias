import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { captureError } from '@/services/analytics';
import { ErrorState } from './States';
import { Screen } from './Screen';

/** Route-level error boundary (Expo Router): reports to Sentry (if consented) and offers retry. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  useEffect(() => {
    captureError(error);
  }, [error]);
  return (
    <Screen scroll={false}>
      <ErrorState message={t('common.errorMessage')} onRetry={retry} />
    </Screen>
  );
}
