/**
 * Public runtime configuration. Only EXPO_PUBLIC_* variables are inlined into the bundle;
 * secrets (Anthropic, USDA, RevenueCat webhook, service role) live exclusively in Supabase.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Mocks are forced on when the backend is not configured, so the app always runs. */
const mocksRequested = process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';
const backendConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  useMocks: mocksRequested || !backendConfigured,
  backendConfigured,
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://bocado.app/terminos',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://bocado.app/privacidad',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'soporte@bocado.app',
} as const;

/** Current version of Terms/Privacy the user must accept. Bump when legal docs change. */
export const LEGAL_VERSION = '2026-10-01';
