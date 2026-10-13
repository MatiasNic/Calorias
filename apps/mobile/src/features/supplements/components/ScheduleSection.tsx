import { formatTimeOfDay, parseTimeOfDay } from '@bocado/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, IconButton, SectionHeader } from '@/components';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { WEEK_ORDER, weekdayName } from '@/features/training/labels';
import { spacing } from '@/theme';
import type { SupplementForm } from '../useSupplementForm';
import { SwitchRow } from './SwitchRow';

/** Weekdays, times of day and the reminders switch. */
export function ScheduleSection({ form }: { form: SupplementForm }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionHeader title={t('supplements.schedule')} />
      <View style={styles.wrap}>
        <Chip
          label={t('supplements.everyDay')}
          selected={form.days.length === 0}
          onPress={() => form.setDays([])}
        />
        {WEEK_ORDER.map((d) => (
          <Chip
            key={d}
            label={weekdayName(d)}
            selected={form.days.length === 0 || form.days.includes(d)}
            onPress={() => form.toggleDay(d)}
          />
        ))}
      </View>
      <AppText variant="label" color="textMuted">
        {t('supplements.times')}
      </AppText>
      {form.times.map((time, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.flex}>
            <TimeStepper
              value={parseTimeOfDay(time)}
              onChange={(v) => form.changeTime(i, formatTimeOfDay(v))}
            />
          </View>
          <IconButton
            icon="remove-circle-outline"
            color="textMuted"
            disabled={form.times.length <= 1}
            accessibilityLabel={t('supplements.removeTime', { time })}
            onPress={() => form.removeTime(i)}
          />
        </View>
      ))}
      {form.canAddTime ? (
        <Button
          label={t('supplements.addTime')}
          variant="ghost"
          size="sm"
          icon="add"
          fullWidth={false}
          onPress={form.addTime}
        />
      ) : null}
      <Card style={styles.group}>
        <SwitchRow
          label={t('supplements.reminders')}
          value={form.reminders}
          onChange={form.setReminders}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
});
