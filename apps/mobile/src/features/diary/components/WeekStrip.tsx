import { addDays, startOfWeek, type IsoDate } from '@plato/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, IconButton } from '@/components';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal, weekdayShort } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

/** Swipeable-by-arrows week selector. Future days are disabled. */
export function WeekStrip({
  value,
  onChange,
  loggedDates,
}: {
  value: IsoDate;
  onChange: (d: IsoDate) => void;
  loggedDates?: ReadonlySet<string>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = todayLocal();
  const monday = startOfWeek(value);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const nextWeek = addDays(monday, 7);

  return (
    <View style={styles.row}>
      <IconButton
        icon="chevron-back"
        accessibilityLabel={t('diary.prevWeek')}
        onPress={() => onChange(addDays(value, -7))}
        size={20}
      />
      {days.map((d) => {
        const selected = d === value;
        const future = d > today;
        const logged = loggedDates?.has(d);
        return (
          <Pressable
            key={d}
            disabled={future}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: future }}
            accessibilityLabel={formatDay(d)}
            onPress={() => {
              haptic('selection');
              onChange(d);
            }}
            style={[
              styles.day,
              selected && { backgroundColor: colors.primary },
              future && { opacity: 0.35 },
            ]}
          >
            <AppText variant="caption" color={selected ? 'onPrimary' : 'textMuted'}>
              {weekdayShort(d)}
            </AppText>
            <AppText
              variant="bodyStrong"
              color={selected ? 'onPrimary' : d === today ? 'primary' : 'text'}
            >
              {Number(d.slice(8))}
            </AppText>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: logged
                    ? selected
                      ? colors.onPrimary
                      : colors.primary
                    : 'transparent',
                },
              ]}
            />
          </Pressable>
        );
      })}
      <IconButton
        icon="chevron-forward"
        accessibilityLabel={t('diary.nextWeek')}
        onPress={() => onChange(nextWeek > today ? today : addDays(value, 7))}
        disabled={value >= today}
        size={20}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    gap: 1,
    minHeight: 56,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
