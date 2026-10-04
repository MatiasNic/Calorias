import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, IconButton, Screen, Skeleton, TextField, toast } from '@/components';
import { DraftItemCard } from '@/features/diary/DraftItemCard';
import { DraftTotals } from '@/features/diary/DraftTotals';
import { useDraftStore } from '@/features/diary/draftStore';
import { deleteMeal, saveMeal, useMeal } from '@/features/diary/hooks';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { saveMealAsFavorite } from '@/features/foods/hooks';
import { spacing } from '@/theme';
import { formatDay, timestampFor } from '@/utils/dates';

export default function MealEditor() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meal = useMeal(id);
  const { draft, start, patch, clear } = useDraftStore();

  useEffect(() => {
    if (!meal.data) return;
    const d = new Date(meal.data.eaten_at);
    start({
      mealId: meal.data.id,
      date: meal.data.local_date,
      time: { h: d.getHours(), m: d.getMinutes() },
      mealType: meal.data.meal_type,
      source: meal.data.source,
      items: meal.data.items,
      photoPath: meal.data.photo_path,
      localPhotoUri: meal.data.local_photo_uri,
      aiScanId: meal.data.ai_scan_id,
      dishName: null,
      hiddenQuestion: null,
      notes: meal.data.note,
      original: null,
    });
  }, [meal.data, start]);

  if (!draft || meal.isLoading) {
    return (
      <Screen>
        <Skeleton height={200} />
      </Screen>
    );
  }

  const save = async () => {
    if (!draft.items.length) {
      await deleteMeal(draft.mealId!);
    } else {
      await saveMeal({
        id: draft.mealId ?? undefined,
        date: draft.date,
        eatenAt: timestampFor(draft.date, draft.time),
        mealType: draft.mealType,
        source: draft.source,
        items: draft.items,
        note: draft.notes,
      });
    }
    toast.success(t('diary.saved'));
    clear();
    router.back();
  };

  const remove = () =>
    Alert.alert(t('diary.deleteTitle'), t('diary.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(draft.mealId!);
          clear();
          router.back();
        },
      },
    ]);

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={<Button label={t('common.save')} onPress={save} testID="meal-save" />}
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => {
            clear();
            router.back();
          }}
        />
        <AppText variant="heading" style={styles.flex}>
          {t('diary.editMeal')}
        </AppText>
        <IconButton
          icon="star-outline"
          accessibilityLabel={t('diary.saveFavorite')}
          onPress={async () => {
            await saveMealAsFavorite(
              draft.items
                .map((i) => i.display_name)
                .join(', ')
                .slice(0, 80),
              draft.items,
            );
            toast.success(t('diary.favoriteSaved'));
          }}
        />
        <IconButton
          icon="trash"
          color="danger"
          accessibilityLabel={t('common.delete')}
          onPress={remove}
        />
      </View>
      <AppText color="textMuted">{formatDay(draft.date)}</AppText>
      <MealTypePicker value={draft.mealType} onChange={(m) => patch({ mealType: m })} />
      <TimeStepper value={draft.time} onChange={(time) => patch({ time })} />
      {draft.items.map((item, i) => (
        <DraftItemCard
          key={item.id ?? i}
          item={item}
          index={i}
          showConfidence={item.ai_confidence != null}
        />
      ))}
      <Button
        label={t('review.addItem')}
        variant="outline"
        icon="add"
        onPress={() => router.push({ pathname: '/food-search', params: { target: 'draft' } })}
      />
      <DraftTotals items={draft.items} />
      <TextField
        label={t('diary.note')}
        value={draft.notes ?? ''}
        onChangeText={(v) => patch({ notes: v })}
        multiline
        maxLength={500}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  gap: { gap: spacing.md },
});
