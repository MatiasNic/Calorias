import { suggestMealType, type MealType } from '@bocado/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { useRecipeDraftStore } from '@/features/foods/recipeDraft';
import { logRecipe, recipeTotals, saveRecipe } from '@/features/foods/recipes';
import { checkAchievements } from '@/features/habits/hooks';
import { useConfirmLeave } from '@/hooks/useConfirmLeave';
import { repos } from '@/services/db/repository';
import { todayLocal } from '@/utils/dates';
import { captureError } from '@/services/analytics';
import type { RecipeItem } from '@/services/db/types';

/** What the editor saves, to tell whether leaving would lose something. */
const recipeValues = (r: { name: string; servings: number; items: RecipeItem[] }) =>
  JSON.stringify([r.name, r.servings, r.items]);

/**
 * Recipe editor state: loads the recipe `id` into the draft (and clears it on close), computes
 * totals and exposes save / log a serving / delete.
 */
export function useRecipeEditor(id: string | undefined) {
  const { t } = useTranslation();
  const draft = useRecipeDraftStore();
  const [logServings, setLogServings] = useState(1);
  const [mealType, setMealType] = useState<MealType>(suggestMealType(new Date().getHours()));
  // Last loaded or saved version: back asks only when the draft differs from it.
  const [savedValues, setSavedValues] = useState(() =>
    recipeValues(useRecipeDraftStore.getState()),
  );
  const allowLeave = useConfirmLeave(recipeValues(draft) !== savedValues);

  // A closed editor must not leak its recipe into the next "new recipe".
  useEffect(() => () => useRecipeDraftStore.getState().reset(), []);

  useEffect(() => {
    if (!id) return;
    repos.recipes.get(id).then((r) => {
      if (!r) return;
      useRecipeDraftStore
        .getState()
        .set({ id: r.id, name: r.name, servings: r.servings, items: r.items });
      setSavedValues(recipeValues(r));
    });
  }, [id]);

  const { totals } = recipeTotals(draft.items);
  const perServing = draft.servings > 0 ? totals.kcal / draft.servings : 0;

  const save = async () => {
    const r = await saveRecipe({
      id: draft.id,
      name: draft.name,
      servings: draft.servings,
      items: draft.items,
    });
    useRecipeDraftStore.getState().set({ id: r.id });
    setSavedValues(recipeValues(useRecipeDraftStore.getState()));
    checkAchievements().catch((e) => captureError(e, { where: 'checkAchievements' }));
    toast.success(t('recipes.saved'));
  };

  const log = async () => {
    const r = await saveRecipe({
      id: draft.id,
      name: draft.name,
      servings: draft.servings,
      items: draft.items,
    });
    await logRecipe(r, logServings, todayLocal(), mealType);
    toast.success(t('recipes.logged'));
    allowLeave();
    router.back();
  };

  const remove = () =>
    Alert.alert(t('recipes.deleteTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (draft.id) await repos.recipes.remove(draft.id);
          draft.reset();
          allowLeave();
          router.back();
        },
      },
    ]);

  const valid = draft.name.trim().length > 0 && draft.items.length > 0 && draft.servings > 0;

  return {
    draft,
    totals,
    perServing,
    valid,
    logServings,
    setLogServings,
    mealType,
    setMealType,
    save,
    log,
    remove,
  };
}
