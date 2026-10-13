import { addDays, isInRange, startOfWeek, type IsoDate } from '@bocado/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, IconButton } from '@/components';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal, weekdayShort } from '@/utils/dates';
import { formatKcal } from '@/utils/format';
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

const RING = 36;
const STROKE = 3;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type Tone = 'success' | 'dayUnder' | 'dayOver';

/** On target, under or over the day's goal (same range rule as the day totals). */
function toneOf(cell: DayCell): Tone {
  if (isInRange(cell.kcal, cell.target)) return 'success';
  return cell.kcal > cell.target ? 'dayOver' : 'dayUnder';
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
            const tone = cell ? toneOf(cell) : null;
            const progress = cell && cell.target > 0 ? Math.min(cell.kcal / cell.target, 1) : 0;
            const isToday = d === today;
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
                style={[styles.cell, { opacity: !inMonth || future ? 0.25 : 1 }]}
              >
                <View style={styles.ringBox}>
                  <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
                    {isSel ? (
                      <Circle cx={RING / 2} cy={RING / 2} r={R + 1} fill={colors.primary} />
                    ) : null}
                    {tone && !isSel ? (
                      <>
                        <Circle
                          cx={RING / 2}
                          cy={RING / 2}
                          r={R}
                          stroke={colors.ringTrack}
                          strokeWidth={STROKE}
                          fill="none"
                        />
                        <Circle
                          cx={RING / 2}
                          cy={RING / 2}
                          r={R}
                          stroke={colors[tone]}
                          strokeWidth={STROKE}
                          strokeLinecap="round"
                          strokeDasharray={`${CIRC * progress} ${CIRC}`}
                          fill="none"
                          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                        />
                      </>
                    ) : null}
                    {isToday && !isSel && !tone ? (
                      <Circle
                        cx={RING / 2}
                        cy={RING / 2}
                        r={R}
                        stroke={colors.primary}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        fill="none"
                      />
                    ) : null}
                  </Svg>
                  {locked ? (
                    <Icon name="lock-closed" size={12} color={isSel ? 'onPrimary' : 'textSubtle'} />
                  ) : (
                    <AppText
                      variant="label"
                      color={isSel ? 'onPrimary' : 'text'}
                      style={isToday || isSel ? styles.bold : undefined}
                    >
                      {Number(d.slice(8))}
                    </AppText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <MonthSummary month={month} data={data} />
    </View>
  );
}

function MonthSummary({ month, data }: { month: string; data: ReadonlyMap<string, DayCell> }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const days = [...data.entries()].filter(([d]) => d.startsWith(month)).map(([, c]) => c);
  const inRange = days.filter((c) => toneOf(c) === 'success').length;
  const avg = days.length ? days.reduce((s, c) => s + c.kcal, 0) / days.length : 0;
  const stats: { label: string; value: string }[] = [
    { label: t('diary.monthLogged'), value: String(days.length) },
    { label: t('diary.monthInRange'), value: String(inRange) },
    { label: t('diary.monthAvg'), value: days.length ? `${formatKcal(avg)}` : '–' },
  ];
  const legend: { tone: Tone; label: string }[] = [
    { tone: 'success', label: t('diary.monthInRange') },
    { tone: 'dayUnder', label: t('diary.legendUnder') },
    { tone: 'dayOver', label: t('diary.legendOver') },
  ];
  return (
    <View style={styles.summary}>
      <View style={[styles.stats, { backgroundColor: colors.surfaceAlt }]}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <AppText variant="bodyStrong" tabular>
              {s.value}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {s.label}
            </AppText>
          </View>
        ))}
      </View>
      <View
        style={styles.legend}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {legend.map((l) => (
          <View key={l.tone} style={styles.legendItem}>
            <View style={[styles.legendDot, { borderColor: colors[l.tone] }]} />
            <AppText variant="caption" color="textMuted">
              {l.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  week: { flexDirection: 'row' },
  cellText: { flex: 1, textAlign: 'center' },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  ringBox: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  bold: { fontFamily: fontFamily.bold },
  summary: { gap: spacing.sm, marginTop: spacing.xs },
  stats: { flexDirection: 'row', borderRadius: radii.md, paddingVertical: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
});
