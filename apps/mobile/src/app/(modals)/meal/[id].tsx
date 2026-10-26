import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, IconButton, Screen, Skeleton, TextField, toast } from '@/components';
import { DraftItemCard } from '@/features/diary/DraftItemCard';
import { DraftTotals } from '@/features/diary/DraftTotals';
import { useDraftStore, type MealDraft } from '@/features/diary/draftStore';
import { deleteMeal, saveMeal, useMeal } from '@/features/diary/hooks';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { WeekStrip } from '@/features/diary/components/WeekStrip';
import { saveMealAsFavorite } from '@/features/foods/hooks';
import { usePlateStore } from '@/features/foods/plateStore';
import { checkAchievements } from '@/features/habits/hooks';
import { useConfirmLeave } from '@/hooks/useConfirmLeave';
import { captureError } from '@/services/analytics';
import { spacing } from '@/theme';
import { formatDay, timestampFor } from '@/utils/dates';

/** What the user can change in the editor, to tell whether leaving would lose something. */
const editable = (d: Pick<MealDraft, 'date' | 'time' | 'mealType' | 'items' | 'notes'>) =>
  JSON.stringify([d.date, d.time, d.mealType, d.items, d.notes ?? null]);

export default function MealEditor() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  // 'new': a plate built in the food search (the draft is already started).
  const isNew = id === 'new';
  const meal = useMeal(isNew ? '' : id);
  const { draft, start, patch, clear } = useDraftStore();
  // The plate as handed over by the search, or the saved meal.
  const [newBaseline] = useState(() => {
    const d = useDraftStore.getState().draft;
    return isNew && d ? editable(d) : null;
  });
  const saved = meal.data;
  const baseline = isNew
    ? newBaseline
    : saved
      ? editable({
          date: saved.local_date,
          time: {
            h: new Date(saved.eaten_at).getHours(),
            m: new Date(saved.eaten_at).getMinutes(),
          },
          mealType: saved.meal_type,
          items: saved.items,
          notes: saved.note,
        })
      : null;
  const dirty = !!draft && baseline != null && editable(draft) !== baseline;
  const allowLeave = useConfirmLeave(dirty);

  // Whichever way the editor closes, its draft must not linger for the next one.
  useEffect(() => () => useDraftStore.getState().clear(), []);

  useEffect(() => {
    if (isNew || !meal.data) return;
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
      quickAnswers: [],
      itemMeals: {},
      groupTimes: {},
      lastCorrection: null,
      notes: meal.data.note,
      original: null,
    });
  }, [isNew, meal.data, start]);

  if (!draft || (!isNew && meal.isLoading)) {
    return (
      <Screen>
        <Skeleton height={200} />
      </Screen>
    );
  }

  const save = async () => {
    if (!draft.items.length) {
      if (draft.mealId) await deleteMeal(draft.mealId);
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
    allowLeave();
    if (isNew) {
      // Saved plate: close the editor and the food search behind it.
      usePlateStore.getState().clear();
      checkAchievements().catch((e) => captureError(e, { where: 'checkAchievements' }));
      router.dismiss(2);
    } else router.back();
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
          allowLeave();
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
          onPress={() => router.back()}
        />
        <AppText variant="heading" style={styles.flex}>
          {isNew ? t('plate.reviewTitle') : t('diary.editMeal')}
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
        {isNew ? null : (
          <IconButton
            icon="trash"
            color="danger"
            accessibilityLabel={t('common.delete')}
            onPress={remove}
          />
        )}
      </View>
      {/* Logged on the wrong day: swipe or use the arrows to move it (up to today). */}
      <AppText variant="label" color="textMuted">
        {t('diary.mealDay', { day: formatDay(draft.date) })}
      </AppText>
      <WeekStrip value={draft.date} onChange={(date) => patch({ date })} />
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
