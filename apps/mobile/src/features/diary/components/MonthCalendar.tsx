import { addDays, isInRange, startOfWeek, type IsoDate } from '@plato/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, IconButton } from '@/components';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal, weekdayShort } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

export interface DayCell {
  kcal: number;
  target: number;
}

export interface MonthCalendarProps {
  month: string; // YYYY-MM
  onMonthChange: (m: string) => void;
  selected: IsoDate;
  onSelect: (d: IsoDate) => void;
  data: ReadonlyMap<string, DayCell>;
  /** Days before this date are locked (free plan history limit). */
  lockedBefore?: IsoDate | null;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  data,
  lockedBefore,
}: MonthCalendarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = todayLocal();
  const first = `${month}-01`;
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7)).filter((w) =>
    w.some((d) => d.startsWith(month)),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={t('diary.prevMonth')}
          onPress={() => onMonthChange(shiftMonth(month, -1))}
        />
        <AppText variant="subheading" style={styles.title} accessibilityRole="header">
          {formatDay(first, { month: 'long', year: 'numeric' })}
        </AppText>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel={t('diary.nextMonth')}
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          disabled={shiftMonth(month, 1) > today.slice(0, 7)}
        />
      </View>
      <View style={styles.week}>
        {cells.slice(0, 7).map((d) => (
          <AppText key={d} variant="caption" color="textMuted" style={styles.cellText}>
            {weekdayShort(d)}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.week}>
          {week.map((d) => {
            const inMonth = d.startsWith(month);
            const future = d > today;
            const locked = !!lockedBefore && d < lockedBefore;
            const cell = data.get(d);
            const isSel = d === selected;
            const tone = cell
              ? isInRange(cell.kcal, cell.target)
                ? colors.success
                : cell.kcal > cell.target
                  ? colors.accent
                  : colors.carbs
              : null;
            return (
              <Pressable
                key={d}
                disabled={!inMonth || future}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel, disabled: !inMonth || future }}
                accessibilityLabel={`${formatDay(d)}${cell ? `, ${Math.round(cell.kcal)} kcal` : ''}${locked ? `, ${t('diary.locked')}` : ''}`}
                onPress={() => {
                  haptic('selection');
                  onSelect(d);
                }}
                style={[
                  styles.cell,
                  isSel && { backgroundColor: colors.primary },
                  { opacity: !inMonth || future ? 0.25 : 1 },
                ]}
              >
                <AppText
                  variant="label"
                  color={isSel ? 'onPrimary' : d === today ? 'primary' : 'text'}
                >
                  {Number(d.slice(8))}
                </AppText>
                {locked ? (
                  <Icon name="lock-closed" size={10} color={isSel ? 'onPrimary' : 'textSubtle'} />
                ) : (
                  <View style={[styles.dot, { backgroundColor: tone ?? 'transparent' }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  week: { flexDirection: 'row' },
  cellText: { flex: 1, textAlign: 'center' },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: radii.md,
    gap: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
