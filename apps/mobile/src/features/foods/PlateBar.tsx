import type { MealType } from '@bocado/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button } from '@/components';
import { useDraftStore } from '@/features/diary/draftStore';
import { mealTotals } from '@/features/diary/mealMath';
import { radii, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { usePlateStore } from './plateStore';

/** Bottom bar of the food search while a plate is being built: count, kcal and "review". */
export function PlateBar({ fallbackMealType }: { fallbackMealType: MealType }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plate = usePlateStore();
  if (!plate.items.length) return null;
  const kcal = mealTotals(plate.items).kcal;

  const review = () => {
    const now = new Date();
    useDraftStore.getState().start({
      mealId: null,
      date: plate.date!,
      time: { h: now.getHours(), m: now.getMinutes() },
      mealType: plate.mealType ?? fallbackMealType,
      source: 'manual',
      items: plate.items,
      photoPath: null,
      localPhotoUri: null,
      aiScanId: null,
      dishName: null,
      hiddenQuestion: null,
      quickAnswers: [],
      itemMeals: {},
      groupTimes: {},
      lastCorrection: null,
      notes: null,
      original: null,
    });
    router.push({ pathname: '/meal/[id]', params: { id: 'new' } });
  };

  return (
    <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]} testID="plate-bar">
      <View style={styles.text}>
        <AppText variant="bodyStrong">{t('plate.title')}</AppText>
        <AppText variant="caption" color="textMuted" tabular>
          {t('plate.summary', { count: plate.items.length, kcal: formatKcal(kcal) })}
        </AppText>
      </View>
      <Button
        label={t('plate.review')}
        size="md"
        icon="arrow_forward"
        onPress={review}
        testID="plate-review"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  text: { flex: 1, gap: 2 },
});
