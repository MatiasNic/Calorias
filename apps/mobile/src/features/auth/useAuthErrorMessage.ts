import { useTranslation } from 'react-i18next';

import { AuthError } from '@/services/auth';

export function useAuthErrorMessage() {
  const { t } = useTranslation();
  return (e: unknown): string => {
    if (!(e instanceof AuthError)) return t('common.errorMessage');
    switch (e.code) {
      case 'invalid_credentials':
        return t('auth.errors.invalidCredentials');
      case 'email_not_confirmed':
        return t('auth.errors.notConfirmed');
      case 'email_taken':
        return t('auth.errors.emailTaken');
      case 'weak_password':
        return t('auth.errors.passwordShort');
      case 'link_expired':
        return t('auth.errors.linkExpired');
      case 'network':
        return t('auth.errors.network');
      default:
        return t('common.errorMessage');
    }
  };
}

/** Zod messages are i18n keys; this narrows the type for t(). */
export type AuthMessageKey =
  | 'auth.errors.email'
  | 'auth.errors.required'
  | 'auth.errors.passwordShort'
  | 'auth.errors.acceptTerms';
