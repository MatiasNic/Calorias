import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

import { env } from '@/config/env';
import { usePrefsStore } from '@/stores/prefs';

/**
 * Product analytics (PostHog) and crash reporting (Sentry) are strictly opt-in. Nothing is sent
 * until the user consents in onboarding/settings. Health data and meal contents are never sent:
 * only event names and coarse properties.
 */
let posthog: PostHog | null = null;
let sentryStarted = false;

export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'meal_saved'
  | 'meal_corrected'
  | 'usual_meal_logged'
  | 'paywall_viewed'
  | 'paywall_purchase'
  | 'paywall_dismissed'
  | 'quota_exceeded'
  | 'barcode_scanned'
  | 'coach_message'
  | 'account_deleted';

export function initAnalytics() {
  const { analyticsConsent, crashReportingConsent } = usePrefsStore.getState();
  if (crashReportingConsent && env.sentryDsn && !sentryStarted) {
    Sentry.init({
      dsn: env.sentryDsn,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      enabled: !__DEV__,
      // Request breadcrumbs carry URLs with signed-photo tokens, filters and user ids: keep only
      // the path, without ids.
      beforeBreadcrumb(crumb) {
        if (crumb.category === 'fetch' || crumb.category === 'xhr') {
          const url = typeof crumb.data?.url === 'string' ? crumb.data.url : '';
          const clean = (url.split(/[?#]/)[0] ?? '').replace(/[0-9a-f-]{36}/gi, '…');
          return { ...crumb, data: { ...crumb.data, url: clean } };
        }
        return crumb;
      },
    });
    sentryStarted = true;
  }
  // Consent withdrawn: stop sending right away, not at the next start.
  if (!crashReportingConsent && sentryStarted) {
    void Sentry.close();
    sentryStarted = false;
  }
  if (analyticsConsent && env.posthogKey && !posthog) {
    posthog = new PostHog(env.posthogKey, {
      host: env.posthogHost,
      captureAppLifecycleEvents: true,
    });
  }
  if (!analyticsConsent && posthog) {
    posthog.optOut().catch(() => undefined);
    posthog = null;
  }
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean | null>,
) {
  if (!usePrefsStore.getState().analyticsConsent) return;
  posthog?.capture(event, props ?? undefined);
}

export function identify(userId: string) {
  if (!usePrefsStore.getState().analyticsConsent) return;
  posthog?.identify(userId);
  if (sentryStarted) Sentry.setUser({ id: userId });
}

export function captureError(e: unknown, context?: Record<string, unknown>) {
  if (sentryStarted) Sentry.captureException(e, { extra: context });
  else if (__DEV__) console.warn(e, context);
}

/** Paywall A/B variant from PostHog feature flags (defaults to control). */
export function paywallVariant(): 'control' | 'annual_focus' {
  const v = posthog?.getFeatureFlag('paywall-variant');
  return v === 'annual_focus' ? 'annual_focus' : 'control';
}
