import { addDays, type MealType } from '@plato/shared';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18next } from '@/i18n';
import type { NotificationSettingsRecord, SupplementRecord } from '@/services/db/types';
import { isoDateToDate, todayLocal } from '@/utils/dates';

/** Days ahead we pre-schedule one-off meal reminders (so a logged meal can cancel today's). */
const SCHEDULE_DAYS = 7;
const CHANNEL_ID = 'reminders';

export function configureNotificationHandler() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18next.t('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const parseTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return { hour: h ?? 9, minute: m ?? 0 };
};

const mealId = (type: MealType, date: string) => `meal-${type}-${date}`;

/**
 * Rebuilds the reminder schedule. "Smart" meal reminders are one-off notifications for the next
 * days; logging that meal cancels today's reminder (see cancelMealReminderToday).
 */
export async function rescheduleAll(
  settings: NotificationSettingsRecord,
  loggedToday: ReadonlySet<MealType>,
  supplements: readonly SupplementRecord[] = [],
  /** Localized "name · dose" for a supplement notification. */
  describeSupplement: (s: SupplementRecord) => { name: string; dose: string } = (s) => ({
    name: s.name,
    dose: String(s.dose_amount),
  }),
) {
  if ((await notificationPermission()) !== 'granted') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const t = i18next.t.bind(i18next);
  const today = todayLocal();
  const now = Date.now();

  for (const [type, cfg] of Object.entries(settings.meal_reminders) as [
    MealType,
    { enabled: boolean; time: string },
  ][]) {
    if (!cfg.enabled) continue;
    const { hour, minute } = parseTime(cfg.time);
    for (let i = 0; i < SCHEDULE_DAYS; i++) {
      const date = addDays(today, i);
      if (i === 0 && loggedToday.has(type) && settings.smart_reminders) continue;
      const when = isoDateToDate(date);
      when.setHours(hour, minute, 0, 0);
      if (when.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: mealId(type, date),
        content: {
          title: t(`notifications.meal.${type}.title`),
          body: t(`notifications.meal.${type}.body`),
          data: { url: '/scan' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    }
  }

  if (settings.water_reminder.enabled) {
    const from = parseTime(settings.water_reminder.from).hour;
    const to = parseTime(settings.water_reminder.to).hour;
    for (let h = from; h <= to; h += Math.max(1, settings.water_reminder.everyHours)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: t('notifications.water.title'), body: t('notifications.water.body') },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: 0,
          channelId: CHANNEL_ID,
        },
      });
    }
  }

  if (settings.weigh_in_reminder.enabled) {
    const { hour, minute } = parseTime(settings.weigh_in_reminder.time);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.weighIn.title'),
        body: t('notifications.weighIn.body'),
        data: { url: '/weight' },
      },
      // expo weekday: 1 = Sunday … 7 = Saturday; ours: 0 = Sunday … 6 = Saturday
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: settings.weigh_in_reminder.weekday + 1,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  }

  // Supplement reminders: one per scheduled time, daily or on the chosen weekdays.
  for (const s of supplements) {
    if (!s.active || !s.reminders) continue;
    const content = {
      title: t('notifications.supplement.title'),
      body: t('notifications.supplement.body', describeSupplement(s)),
      data: { url: '/supplements' },
    };
    for (const time of s.times) {
      const { hour, minute } = parseTime(time);
      if (s.days.length === 0) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: CHANNEL_ID,
          },
        });
        continue;
      }
      for (const day of s.days) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour,
            minute,
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  }

  if (settings.weekly_summary) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.weekly.title'),
        body: t('notifications.weekly.body'),
        data: { url: '/weekly-summary?week=last' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 9,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function cancelMealReminderToday(type: MealType) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(mealId(type, todayLocal())).catch(
    () => undefined,
  );
}

export const DEFAULT_NOTIFICATION_SETTINGS = (id: string): NotificationSettingsRecord => ({
  id,
  meal_reminders: {
    breakfast: { enabled: true, time: '08:30' },
    lunch: { enabled: true, time: '13:00' },
    snack: { enabled: false, time: '17:30' },
    dinner: { enabled: true, time: '21:00' },
  },
  water_reminder: { enabled: false, everyHours: 2, from: '09:00', to: '21:00' },
  weigh_in_reminder: { enabled: false, weekday: 1, time: '08:00' },
  smart_reminders: true,
  weekly_summary: true,
});

/** Removes every scheduled reminder (account deletion, sign out). */
export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
