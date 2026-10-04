import 'i18next';

import type { Translation } from './locales/es';

// Type-checks every t('key') call against the Spanish source translation.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: Translation };
  }
}
