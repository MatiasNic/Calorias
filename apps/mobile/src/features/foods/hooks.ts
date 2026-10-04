import type { MealItem } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { newId, repos } from '@/services/db/repository';
import type { FavoriteRecord } from '@/services/db/types';
import { searchRemoteFoods } from './remote';
import { dedupeFoods, recentFoods, searchCustom, searchRegional, type FoodOption } from './search';

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Local results are instant (regional + custom); USDA results stream in after. */
export function useFoodSearch(query: string) {
  const q = query.trim();
  const debounced = useDebounced(q);
  const local = useQuery({
    queryKey: ['foods', 'local', q],
    queryFn: async () => dedupeFoods([await searchCustom(q), searchRegional(q)]),
    enabled: q.length >= 2,
  });
  const remote = useQuery({
    queryKey: ['foods', 'remote', debounced],
    queryFn: () => searchRemoteFoods(debounced),
    enabled: debounced.length >= 3,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const results = dedupeFoods([local.data ?? [], remote.data ?? []]);
  return { results, loadingRemote: remote.isFetching, remoteError: remote.isError };
}

export function useRecentFoods() {
  return useQuery({ queryKey: ['db', 'meals', 'recents'], queryFn: () => recentFoods(30) });
}

export function useFavorites() {
  return useQuery({ queryKey: ['db', 'favorites'], queryFn: () => repos.favorites.list() });
}

export function useCustomFoods() {
  return useQuery({ queryKey: ['db', 'foods_custom'], queryFn: () => repos.foodsCustom.list() });
}

export function favoriteKeyForFood(f: FoodOption) {
  return `food:${f.key}`;
}

export async function toggleFoodFavorite(
  food: FoodOption,
  favorites: readonly FavoriteRecord[],
  lastGrams: number,
) {
  const existing = favorites.find((x) => x.kind === 'food' && x.label === favoriteKeyForFood(food));
  if (existing) {
    await repos.favorites.remove(existing.id);
    return false;
  }
  const item: MealItem = {
    id: newId(),
    display_name: food.name,
    food_id: food.id,
    food_source: food.source,
    grams: lastGrams,
    per100g: food.per100g,
    nutrients: food.per100g,
    user_edited: false,
  };
  await repos.favorites.upsert({
    id: newId(),
    kind: 'food',
    label: favoriteKeyForFood(food),
    payload: { items: [item] },
  });
  return true;
}

export async function saveMealAsFavorite(label: string, items: MealItem[]) {
  return repos.favorites.upsert({ id: newId(), kind: 'meal', label, payload: { items } });
}
