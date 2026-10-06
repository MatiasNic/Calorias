// Hermes may ship without Intl.PluralRules; i18next needs it for _one/_other keys.
import 'intl-pluralrules';

import type { AppLocale } from '@plato/shared';
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './locales/en';
import { es } from './locales/es';
import { pt } from './locales/pt';

export const SUPPORTED_LOCALES: readonly AppLocale[] = ['es-AR', 'en-US', 'pt-BR'];
export const DEFAULT_LOCALE: AppLocale = 'es-AR';

/** Maps the device locale to one of the supported app locales. */
export function detectLocale(): AppLocale {
  const device = getLocales()[0];
  const lang = device?.languageCode ?? 'es';
  if (lang === 'en') return 'en-US';
  if (lang === 'pt') return 'pt-BR';
  return DEFAULT_LOCALE;
}

export function initI18n(locale: AppLocale | null) {
  if (i18next.isInitialized) return i18next;
  i18next.use(initReactI18next).init({
    resources: {
      'es-AR': { translation: es },
      'en-US': { translation: en },
      'pt-BR': { translation: pt },
    },
    lng: locale ?? detectLocale(),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18next;
}

export function changeLocale(locale: AppLocale) {
  return i18next.changeLanguage(locale);
}

export function currentLocale(): AppLocale {
  const lng = i18next.language as AppLocale;
  return SUPPORTED_LOCALES.includes(lng) ? lng : DEFAULT_LOCALE;
}

export { i18next };
