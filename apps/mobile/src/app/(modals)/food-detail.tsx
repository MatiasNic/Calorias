import { scaleNutrients, type MealType } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, IconButton, Screen, toast } from '@/components';
import { saveMeal } from '@/features/diary/hooks';
import { makeItem } from '@/features/diary/mealMath';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { useDraftStore } from '@/features/diary/draftStore';
import { checkAchievements } from '@/features/habits/hooks';
import { favoriteKeyForFood, toggleFoodFavorite, useFavorites } from '@/features/foods/hooks';
import { NutrientTable } from '@/features/foods/NutrientTable';
import { usePickerStore } from '@/features/foods/pickerStore';
import { PortionEditor } from '@/features/foods/PortionEditor';
import { useRecipeDraftStore } from '@/features/foods/recipeDraft';
import { spacing } from '@/theme';
import { haptic } from '@/utils/haptics';

export default function FoodDetail() {
  const { t } = useTranslation();
  const { food, target, replaceIndex, clear } = usePickerStore();
  const favorites = useFavorites();
  const initial = food?.lastGrams ?? food?.servings[0]?.grams ?? 100;
  const [grams, setGrams] = useState(initial);
  const [mealType, setMealType] = useState<MealType>(
    target?.kind === 'diary' ? target.mealType : 'lunch',
  );

  if (!food || !target) {
    return (
      <Screen>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const nutrients = scaleNutrients(food.per100g, grams);
  const isFav = (favorites.data ?? []).some(
    (f) => f.kind === 'food' && f.label === favoriteKeyForFood(food),
  );

  const add = async () => {
    const item = makeItem(food, grams);
    if (target.kind === 'draft') {
      const draft = useDraftStore.getState();
      if (replaceIndex != null) draft.replaceItem(replaceIndex, { ...item, user_edited: true });
      else draft.addItem({ ...item, user_edited: true });
      clear();
      router.dismiss(2);
      return;
    }
    if (target.kind === 'recipe') {
      useRecipeDraftStore.getState().addItem({
        display_name: food.name,
        food_id: food.id,
        food_source: food.source,
        grams,
        per100g: food.per100g,
      });
      clear();
      router.dismiss(2);
      return;
    }
    await saveMeal({
      date: target.date,
      mealType,
      source: food.source === 'off' ? 'barcode' : 'manual',
      items: [item],
    });
    haptic('success');
    toast.success(t('foodDetail.added', { name: food.name }));
    checkAchievements().catch(() => undefined);
    clear();
    router.dismiss(2);
  };

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <Button
          label={
            target.kind === 'diary'
              ? t('foodDetail.addTo', { meal: t(`mealTypes.${mealType}`) })
              : t('common.add')
          }
          icon="add"
          onPress={add}
          disabled={grams <= 0}
          testID="food-detail-add"
        />
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-back"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        <View style={styles.flex} />
        <IconButton
          icon={isFav ? 'star' : 'star-outline'}
          color={isFav ? 'carbs' : 'text'}
          accessibilityLabel={isFav ? t('foodDetail.unfavorite') : t('foodDetail.favorite')}
          onPress={async () => {
            const now = await toggleFoodFavorite(food, favorites.data ?? [], grams);
            toast.info(now ? t('foodDetail.favorited') : t('foodDetail.unfavorited'));
          }}
        />
      </View>
      <View>
        <AppText variant="title">{food.name}</AppText>
        <AppText variant="caption" color="textMuted">
          {[food.brand, t(`foodSource.${food.source}`)].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <Card style={styles.card}>
        <AppText variant="display" align="center" tabular testID="food-detail-kcal">
          {Math.round(nutrients.kcal)}{' '}
          <AppText variant="heading" color="textMuted">
            kcal
          </AppText>
        </AppText>
        <PortionEditor
          label={t('foodDetail.portion')}
          grams={grams}
          onChange={setGrams}
          servings={food.servings}
          baseGrams={initial}
        />
      </Card>
      {target.kind === 'diary' ? <MealTypePicker value={mealType} onChange={setMealType} /> : null}
      <Card>
        <AppText variant="subheading">{t('foodDetail.nutrientsFor', { grams })}</AppText>
        <NutrientTable n={nutrients} />
      </Card>
      {food.attribution ? (
        <AppText variant="caption" color="textMuted">
          {t('foodDetail.source', { source: food.attribution })}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  card: { gap: spacing.lg },
});
