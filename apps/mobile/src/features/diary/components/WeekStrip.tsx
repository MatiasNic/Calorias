import { addDays, type IsoDate } from '@bocado/shared';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, IconButton } from '@/components';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal, weekdayShort } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

/** How far back the strip goes. */
const DAYS_BACK = 365;
const VISIBLE_DAYS = 7;

/**
 * Day selector: swipe through past days (momentum, snapping day by day), tap one to pick it, the
 * arrows move one day. Future days are not shown. "Hoy" brings today back when it's off screen.
 */
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
  const [width, setWidth] = useState(0);
  const list = useRef<FlatList<IsoDate>>(null);
  const days = Array.from({ length: DAYS_BACK + 1 }, (_, i) => addDays(today, i - DAYS_BACK));
  const itemWidth = width / VISIBLE_DAYS;
  const index = Math.max(0, days.indexOf(value));

  // Keep the chosen day in view (centered) whenever it changes from outside or by the arrows.
  useEffect(() => {
    if (!width) return;
    list.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
  }, [index, width]);

  const pick = (d: IsoDate) => {
    if (d === value) return;
    haptic('selection');
    onChange(d);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={t('diary.prevDay')}
          onPress={() => pick(addDays(value, -1))}
          disabled={index === 0}
          size={20}
        />
        <View
          style={styles.flex}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        >
          {width ? (
            <FlatList
              ref={list}
              horizontal
              data={days}
              keyExtractor={(d) => d}
              showsHorizontalScrollIndicator={false}
              snapToInterval={itemWidth}
              decelerationRate="fast"
              getItemLayout={(_, i) => ({ length: itemWidth, offset: itemWidth * i, index: i })}
              initialScrollIndex={Math.max(0, index - Math.floor(VISIBLE_DAYS / 2))}
              initialNumToRender={VISIBLE_DAYS * 3}
              windowSize={5}
              renderItem={({ item: d }) => {
                const selected = d === value;
                const isToday = d === today;
                const logged = loggedDates?.has(d);
                const firstOfMonth = d.endsWith('-01');
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={formatDay(d)}
                    onPress={() => pick(d)}
                    style={[styles.cell, { width: itemWidth }]}
                  >
                    <View
                      style={[
                        styles.day,
                        selected && { backgroundColor: colors.primary },
                        !selected && isToday && { borderColor: colors.primary, borderWidth: 1.5 },
                      ]}
                    >
                      <AppText variant="caption" color={selected ? 'onPrimary' : 'textMuted'}>
                        {firstOfMonth ? formatDay(d, { month: 'short' }) : weekdayShort(d)}
                      </AppText>
                      <AppText variant="bodyStrong" color={selected ? 'onPrimary' : 'text'}>
                        {Number(d.slice(8))}
                      </AppText>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: logged
                              ? selected
                                ? colors.onPrimary
                                : colors.kcal
                              : 'transparent',
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              }}
            />
          ) : null}
        </View>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel={t('diary.nextDay')}
          onPress={() => pick(addDays(value, 1))}
          disabled={value >= today}
          size={20}
        />
      </View>
      {value !== today ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => pick(today)}
          hitSlop={8}
          style={[styles.todayPill, { backgroundColor: colors.surfaceAlt }]}
        >
          <AppText variant="caption" style={styles.todayText}>
            {t('common.today')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  cell: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  day: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    gap: 1,
    minHeight: 56,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  todayPill: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    minHeight: 32,
    justifyContent: 'center',
  },
  todayText: { fontFamily: fontFamily.bold },
});
