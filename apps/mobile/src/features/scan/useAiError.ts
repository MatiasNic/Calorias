import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { track } from '@/services/analytics';
import { ApiError } from '@/services/api/errors';

/** Maps API errors to friendly messages; quota/premium errors open the contextual paywall. */
export function useAiError() {
  const { t } = useTranslation();
  return (e: unknown): string => {
    if (e instanceof ApiError) {
      switch (e.code) {
        case 'QUOTA_EXCEEDED':
          track('quota_exceeded', { limit: Number(e.details?.limit ?? 0) });
          router.push({ pathname: '/paywall', params: { context: 'quota' } });
          return e.details?.kind === 'text_query'
            ? t('errors.quotaTextBody', { limit: Number(e.details?.limit ?? 5) })
            : t('errors.quotaBody', { limit: Number(e.details?.limit ?? 3) });
        case 'PREMIUM_REQUIRED':
          router.push({ pathname: '/paywall', params: { context: 'feature' } });
          return t('errors.premiumRequired');
        case 'AI_TIMEOUT':
          return t('errors.aiTimeout');
        case 'AI_INVALID_RESPONSE':
          return t('errors.aiInvalid');
        case 'OFFLINE':
        case 'NETWORK':
          return t('errors.offline');
        case 'RATE_LIMITED':
          return t('errors.rateLimited');
        case 'BUDGET_EXCEEDED':
          return t('errors.budget');
        default:
          return t('common.errorMessage');
      }
    }
    return t('common.errorMessage');
  };
}
