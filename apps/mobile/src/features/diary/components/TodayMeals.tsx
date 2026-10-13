import type { IsoDate, MealType } from '@plato/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, IconButton, toast } from '@/components';
import type { MealRecord } from '@/services/db/types';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';

import { repeatFromYesterday } from '../hooks';
import { MealRow } from './MealRow';

/**
 * "Comidas" section of Today: the day's meals and a row to add the next one (search, repeat
 * yesterday's or dictate it).
 */
export function TodayMeals({
  meals,
  date,
  nextType,
}: {
  meals: readonly MealRecord[];
  date: IsoDate;
  nextType: MealType;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const totalKcal = meals.reduce((s, m) => s + m.totals.kcal, 0);
  const nextLabel = t(`mealTypes.${nextType}`);

  const repeat = async () => {
    const n = await repeatFromYesterday(date, nextType);
    if (n) toast.success(t('diary.repeated', { count: n }));
    else toast.info(t('diary.nothingYesterday'));
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <AppText style={styles.section} accessibilityRole="header">
          {t('today.meals')}
        </AppText>
        <AppText variant="caption" color="textMuted" tabular>
          {formatKcal(totalKcal)} kcal
        </AppText>
      </View>
      <View style={styles.meals}>
        {meals.map((m) => (
          <MealRow key={m.id} meal={m} card />
        ))}
        <View style={[styles.addRow, { borderColor: colors.border }]}>
          <Pressable
            testID={`add-${nextType}`}
            accessibilityRole="button"
            accessibilityLabel={t('diary.addTo', { meal: nextLabel })}
            onPress={() =>
              router.push({ pathname: '/food-search', params: { mealType: nextType, date } })
            }
            style={styles.addMain}
          >
            <Icon name="add" color="textMuted" />
            <AppText variant="bodyStrong" color="textMuted">
              {t('today.addMeal', { meal: nextLabel.toLowerCase() })}
            </AppText>
          </Pressable>
          <IconButton
            icon="repeat"
            size={20}
            color="textSubtle"
            accessibilityLabel={t('diary.repeatYesterday', { meal: nextLabel })}
            onPress={repeat}
          />
          <IconButton
            icon="mic"
            size={22}
            color="textMuted"
            accessibilityLabel={t('logBar.voice')}
            onPress={() => router.push({ pathname: '/listen', params: { date } })}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: -spacing.sm,
  },
  section: { fontFamily: fontFamily.extrabold, fontSize: 20, lineHeight: 26 },
  meals: { gap: spacing.sm },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    paddingLeft: spacing.lg,
    minHeight: 56,
  },
  addMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
});
