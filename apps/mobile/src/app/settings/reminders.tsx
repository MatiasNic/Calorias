import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stepper,
} from '@/components';
import {
  rescheduleReminders,
  saveNotificationSettings,
  useNotificationSettings,
} from '@/features/settings/useNotificationSettings';
import { WEEK_ORDER, weekdayName } from '@/features/training/labels';
import type { NotificationSettingsRecord } from '@/services/db/types';
import { notificationPermission, requestNotificationPermission } from '@/services/notifications';
import { usePrefsStore, type TrainingReminder } from '@/stores/prefs';
import { spacing } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const fromMin = (v: number) => `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;

function Row({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="textMuted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}

export default function Reminders() {
  const { t } = useTranslation();
  const q = useNotificationSettings();
  const perm = useQuery({ queryKey: ['notif-permission'], queryFn: notificationPermission });
  const training = usePrefsStore((p) => p.trainingReminder);
  const setPrefs = usePrefsStore((p) => p.set);
  const s = q.data;
  if (!s) return null;
  const saveTraining = (patch: Partial<TrainingReminder>) => {
    setPrefs({ trainingReminder: { ...training, ...patch } });
    rescheduleReminders(s).catch(() => undefined);
  };
  const save = (patch: Partial<NotificationSettingsRecord>) =>
    saveNotificationSettings({ ...s, ...patch }).then(() => q.refetch());

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('settings.reminders.title')} />
      {perm.data !== 'granted' ? (
        <>
          <Banner tone="warning" message={t('settings.reminders.permissionNeeded')} />
          <Button
            label={t('settings.reminders.enable')}
            icon="notifications"
            onPress={async () => {
              await requestNotificationPermission();
              perm.refetch();
              save({});
            }}
          />
        </>
      ) : null}
      <SectionHeader title={t('settings.reminders.meals')} />
      <Card style={styles.card}>
        {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map((type) => {
          const cfg = s.meal_reminders[type];
          return (
            <View key={type} style={styles.block}>
              <Row
                label={t(`mealTypes.${type}`)}
                value={cfg.enabled}
                onChange={(enabled) =>
                  save({ meal_reminders: { ...s.meal_reminders, [type]: { ...cfg, enabled } } })
                }
              />
              {cfg.enabled ? (
                <Stepper
                  label={t('diary.time')}
                  value={toMin(cfg.time)}
                  min={0}
                  max={23 * 60 + 45}
                  step={15}
                  format={fromMin}
                  onChange={(v) =>
                    save({
                      meal_reminders: { ...s.meal_reminders, [type]: { ...cfg, time: fromMin(v) } },
                    })
                  }
                />
              ) : null}
            </View>
          );
        })}
        <Row
          label={t('settings.reminders.smart')}
          hint={t('settings.reminders.smartHint')}
          value={s.smart_reminders}
          onChange={(v) => save({ smart_reminders: v })}
        />
      </Card>
      <Card style={styles.card}>
        <Row
          label={t('settings.reminders.training')}
          hint={t('settings.reminders.trainingHint')}
          value={training.enabled}
          onChange={(enabled) => saveTraining({ enabled })}
        />
        {training.enabled ? (
          <>
            <AppText variant="label" color="textMuted">
              {t('settings.reminders.trainingDays')}
            </AppText>
            <View style={styles.days}>
              {WEEK_ORDER.map((d) => {
                const on = training.days.includes(d);
                return (
                  <Chip
                    key={d}
                    label={weekdayName(d)}
                    selected={on}
                    testID={`training-day-${d}`}
                    onPress={() =>
                      saveTraining({
                        days: on ? training.days.filter((x) => x !== d) : [...training.days, d],
                      })
                    }
                  />
                );
              })}
            </View>
            <Stepper
              label={t('diary.time')}
              value={toMin(training.time)}
              min={0}
              max={23 * 60 + 45}
              step={15}
              format={fromMin}
              onChange={(v) => saveTraining({ time: fromMin(v) })}
            />
          </>
        ) : null}
      </Card>
      <Card style={styles.card}>
        <Row
          label={t('settings.reminders.water')}
          hint={t('settings.reminders.waterEvery', {
            hours: s.water_reminder.everyHours,
            from: s.water_reminder.from,
            to: s.water_reminder.to,
          })}
          value={s.water_reminder.enabled}
          onChange={(v) => save({ water_reminder: { ...s.water_reminder, enabled: v } })}
        />
        <Row
          label={t('settings.reminders.weighIn')}
          value={s.weigh_in_reminder.enabled}
          onChange={(v) => save({ weigh_in_reminder: { ...s.weigh_in_reminder, enabled: v } })}
        />
        <Row
          label={t('settings.reminders.weekly')}
          value={s.weekly_summary}
          onChange={(v) => save({ weekly_summary: v })}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  block: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
