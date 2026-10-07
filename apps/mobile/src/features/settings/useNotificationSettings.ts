import { useQuery } from '@tanstack/react-query';

import { doseLabel, supplementName } from '@/features/training/labels';
import { repos } from '@/services/db/repository';
import type { NotificationSettingsRecord } from '@/services/db/types';
import { DEFAULT_NOTIFICATION_SETTINGS, rescheduleAll } from '@/services/notifications';
import { currentUserId } from '@/stores/session';
import { todayLocal } from '@/utils/dates';

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['db', 'notification_settings'],
    queryFn: async () =>
      (await repos.notificationSettings.get(currentUserId())) ??
      DEFAULT_NOTIFICATION_SETTINGS(currentUserId()),
  });
}

/** Persists settings and rebuilds the local notification schedule. */
export async function saveNotificationSettings(s: NotificationSettingsRecord) {
  await repos.notificationSettings.upsert(s);
  await rescheduleReminders(s);
}

/** Rebuilds the schedule without writing settings (app start, after logging a meal). */
export async function rescheduleReminders(settings?: NotificationSettingsRecord) {
  const s =
    settings ??
    (await repos.notificationSettings.get(currentUserId())) ??
    DEFAULT_NOTIFICATION_SETTINGS(currentUserId());
  const today = todayLocal();
  const [meals, supplements] = await Promise.all([
    repos.meals.list({ from: today, to: today }),
    repos.supplements.list(),
  ]);
  await rescheduleAll(s, new Set(meals.map((m) => m.meal_type)), supplements, (x) => ({
    name: supplementName(x),
    dose: doseLabel(x),
  }));
}
