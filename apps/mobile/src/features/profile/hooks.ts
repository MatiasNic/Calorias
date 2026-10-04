import { ageFromBirthDate, computeGoalPlan, type GoalPlanResult } from '@plato/shared';
import { useMutation, useQuery } from '@tanstack/react-query';

import { currentLocale } from '@/i18n';
import { repos } from '@/services/db/repository';
import type { ProfileRecord } from '@/services/db/types';
import { currentUserId } from '@/stores/session';
import { deviceTimeZone } from '@/utils/dates';

export function emptyProfile(id: string): ProfileRecord {
  return {
    id,
    display_name: null,
    birth_date: null,
    sex: null,
    height_cm: null,
    unit_system: 'metric',
    activity_level: null,
    goal_type: null,
    weekly_rate_kg: null,
    target_weight_kg: null,
    dietary_preferences: [],
    allergies: [],
    timezone: deviceTimeZone(),
    locale: currentLocale(),
    country: 'AR',
    onboarding_completed: false,
    save_photos: true,
    analytics_consent: false,
    terms_accepted_at: null,
    terms_version: null,
  };
}

export async function loadProfile(): Promise<ProfileRecord> {
  const id = currentUserId();
  return (await repos.profile.get(id)) ?? emptyProfile(id);
}

export function useProfile() {
  return useQuery({ queryKey: ['db', 'profile', currentUserId()], queryFn: loadProfile });
}

export async function updateProfile(patch: Partial<ProfileRecord>) {
  const current = await loadProfile();
  return repos.profile.upsert({ ...current, ...patch, id: current.id });
}

export function useUpdateProfile() {
  return useMutation({ mutationFn: updateProfile });
}

/** Recomputes the goal plan from the stored profile and the latest weight. */
export function planFromProfile(p: ProfileRecord, weightKg: number | null): GoalPlanResult | null {
  if (!p.sex || !p.birth_date || !p.height_cm || !p.activity_level || !p.goal_type || !weightKg)
    return null;
  return computeGoalPlan({
    sex: p.sex,
    ageYears: ageFromBirthDate(p.birth_date),
    heightCm: p.height_cm,
    weightKg,
    targetWeightKg: p.target_weight_kg,
    activity: p.activity_level,
    goal: p.goal_type,
    weeklyRateKg: p.weekly_rate_kg,
    dietaryPreferences: p.dietary_preferences,
  });
}
