import { rescheduleReminders } from '@/features/settings/useNotificationSettings';
import { goalDirection } from './steps/ChoiceSteps';
import type { GoalPlan } from '@plato/shared';

import { LEGAL_VERSION } from '@/config/env';
import { logWeight } from '@/features/body/hooks';
import { saveGoalFromPlan } from '@/features/goals/hooks';
import { updateProfile } from '@/features/profile/hooks';
import { track } from '@/services/analytics';
import { repos } from '@/services/db/repository';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/services/notifications';
import { kv } from '@/stores/kv';
import { usePrefsStore } from '@/stores/prefs';
import { currentUserId } from '@/stores/session';
import { todayLocal } from '@/utils/dates';
import { birthDateIso, type OnboardingAnswers } from './store';

export async function finishOnboarding(a: OnboardingAnswers, plan: GoalPlan) {
  const userId = currentUserId();
  let terms: { at: string; version: string } = {
    at: new Date().toISOString(),
    version: LEGAL_VERSION,
  };
  try {
    const stored = kv.get('plato.termsAcceptedAt');
    if (stored) terms = JSON.parse(stored);
  } catch {
    // keep default (acceptance by continuing, shown on the welcome screen)
  }

  await updateProfile({
    sex: a.sex,
    birth_date: birthDateIso(a),
    height_cm: a.heightCm,
    activity_level: a.activity,
    goal_type: plan.effectiveGoal,
    // Only the goals that move weight use a rate and a target.
    weekly_rate_kg: goalDirection(plan.effectiveGoal) !== 0 ? a.weeklyRateKg : null,
    target_weight_kg: goalDirection(plan.effectiveGoal) !== 0 ? a.targetWeightKg : null,
    dietary_preferences: a.dietaryPreferences,
    allergies: a.allergies,
    unit_system: usePrefsStore.getState().units,
    analytics_consent: !!usePrefsStore.getState().analyticsConsent,
    save_photos: usePrefsStore.getState().savePhotos,
    terms_accepted_at: terms.at,
    terms_version: terms.version,
    onboarding_completed: true,
  });
  if (a.weightKg) await logWeight(todayLocal(), a.weightKg);
  await saveGoalFromPlan(plan);
  if (!(await repos.notificationSettings.get(userId))) {
    await repos.notificationSettings.upsert(DEFAULT_NOTIFICATION_SETTINGS(userId));
  }
  // Permission may have just been granted in the permissions step: schedule reminders now.
  await rescheduleReminders().catch(() => undefined);
  track('onboarding_completed', { goal: plan.effectiveGoal, warnings: plan.warnings.length });
}
