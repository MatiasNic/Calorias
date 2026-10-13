import { suggestMealType, type IsoDate, type MealType } from '@bocado/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { useDraftStore } from '@/features/diary/draftStore';
import { makeItem } from '@/features/diary/mealMath';
import { haptic } from '@/utils/haptics';
import type { FavoriteRecord } from '@/services/db/types';
import { todayLocal } from '@/utils/dates';
import { useCustomFoods, useFavorites, useFoodSearch, useRecentFoods } from './hooks';
import { usePickerStore, type PickTarget } from './pickerStore';
import { usePlateStore } from './plateStore';
import type { FoodOption } from './search';

export type FoodSearchTab = 'search' | 'recent' | 'favorites' | 'mine';

export type FoodSearchParams = {
  mealType?: MealType;
  date?: IsoDate;
  tab?: FoodSearchTab;
  target?: 'draft' | 'recipe';
  replace?: string;
};

/**
 * State of the food search screen: query and tab, the picker target (opened on mount, cleared on
 * leave), the list shown for the current tab and the actions for a picked food or favorite meal.
 */
export function useFoodSearchScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<FoodSearchParams>();
  const [tab, setTab] = useState<FoodSearchTab>(params.tab ?? 'search');
  const [query, setQuery] = useState('');
  const picker = usePickerStore();
  const search = useFoodSearch(query);
  const recents = useRecentFoods();
  const favorites = useFavorites();
  const custom = useCustomFoods();

  const date = params.date ?? todayLocal();
  const mealType = params.mealType ?? suggestMealType(new Date().getHours());

  useEffect(() => {
    const target: PickTarget =
      params.target === 'draft'
        ? { kind: 'draft' }
        : params.target === 'recipe'
          ? { kind: 'recipe' }
          : { kind: 'diary', date, mealType, plate: true };
    picker.open(target, params.replace != null ? Number(params.replace) : null);
    // Leaving the search (X / back) must not leave a stale target for the next barcode scan or
    // custom food, which would send the food to an old draft, date or recipe.
    return () => {
      usePickerStore.getState().clear();
      // A plate left behind (e.g. switching to voice) must not reappear in the next search.
      usePlateStore.getState().clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Typing always brings the user back to the search tab. */
  const changeQuery = (v: string) => {
    setQuery(v);
    if (tab !== 'search') setTab('search');
  };

  const pick = (food: FoodOption) => {
    usePickerStore.getState().select(food);
    router.push('/food-detail');
  };

  /** Plate mode: "+" adds the food with its usual (or last used) portion. */
  const quickAdd =
    params.target == null
      ? (food: FoodOption) => {
          const grams = food.lastGrams ?? food.servings[0]?.grams ?? 100;
          usePlateStore.getState().add(makeItem(food, grams), date, mealType);
          haptic('success');
          toast.success(t('plate.added', { name: food.name }));
        }
      : undefined;

  const logFavoriteMeal = async (fav: FavoriteRecord) => {
    if (params.target === 'draft') {
      fav.payload.items.forEach((i) => useDraftStore.getState().addItem(i));
      router.back();
      return;
    }
    // A saved meal joins the plate like any other food (it can be combined and adjusted).
    fav.payload.items.forEach((i) => usePlateStore.getState().add(i, date, mealType));
    toast.success(t('plate.added', { name: fav.label }));
  };

  const customOptions: FoodOption[] = (custom.data ?? []).map((f) => ({
    key: `custom:${f.id}`,
    id: f.id,
    source: 'custom',
    name: f.name,
    brand: f.brand,
    barcode: f.barcode,
    per100g: f.per100g,
    servings: f.servings,
  }));

  const data: FoodOption[] =
    tab === 'search'
      ? search.results
      : tab === 'recent'
        ? (recents.data ?? [])
        : tab === 'mine'
          ? customOptions
          : [];

  return {
    params,
    tab,
    setTab,
    query,
    setQuery,
    changeQuery,
    search,
    favorites: favorites.data ?? [],
    data,
    date,
    mealType,
    pick,
    quickAdd,
    logFavoriteMeal,
  };
}
