import type { IsoDate, MealItem, MealSource, MealType } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { newId, repos } from '@/services/db/repository';
import type { MealRecord } from '@/services/db/types';
import { addDays } from '@plato/shared';
import { timestampFor } from '@/utils/dates';
import { mealTotals } from './mealMath';

export function useMealsForDate(date: IsoDate) {
  return useQuery({
    queryKey: ['db', 'meals', 'date', date],
    queryFn: () => repos.meals.list({ from: date, to: date }),
  });
}

export function useMealsRange(from: IsoDate, to: IsoDate) {
  return useQuery({
    queryKey: ['db', 'meals', 'range', from, to],
    queryFn: () => repos.meals.list({ from, to }),
  });
}

export function useMeal(id: string | undefined) {
  return useQuery({
    queryKey: ['db', 'meals', 'one', id],
    queryFn: () => (id ? repos.meals.get(id) : null),
    enabled: !!id,
  });
}

export interface SaveMealInput {
  id?: string;
  date: IsoDate;
  eatenAt?: string;
  mealType: MealType;
  source: MealSource;
  items: MealItem[];
  photoPath?: string | null;
  localPhotoUri?: string | null;
  note?: string | null;
  aiScanId?: string | null;
}

export async function saveMeal(input: SaveMealInput): Promise<MealRecord> {
  const existing = input.id ? await repos.meals.get(input.id) : null;
  const record: MealRecord = {
    id: input.id ?? newId(),
    eaten_at: input.eatenAt ?? existing?.eaten_at ?? timestampFor(input.date),
    local_date: input.date,
    meal_type: input.mealType,
    source: input.source,
    photo_path: input.photoPath ?? existing?.photo_path ?? null,
    local_photo_uri: input.localPhotoUri ?? existing?.local_photo_uri ?? null,
    note: input.note ?? existing?.note ?? null,
    ai_scan_id: input.aiScanId ?? existing?.ai_scan_id ?? null,
    items: input.items.map((i) => ({ ...i, id: i.id ?? newId() })),
    totals: mealTotals(input.items),
  };
  return repos.meals.upsert(record);
}

export const deleteMeal = (id: string) => repos.meals.remove(id);

export async function duplicateMeal(meal: MealRecord, date: IsoDate, mealType?: MealType) {
  return saveMeal({
    date,
    mealType: mealType ?? meal.meal_type,
    source: meal.source === 'photo' ? 'favorite' : meal.source,
    items: meal.items.map((i) => ({ ...i, id: newId() })),
    note: meal.note,
  });
}

export async function moveMeal(meal: MealRecord, date: IsoDate, mealType: MealType) {
  return repos.meals.upsert({
    ...meal,
    local_date: date,
    meal_type: mealType,
    eaten_at: date === meal.local_date ? meal.eaten_at : timestampFor(date),
  });
}

/** Copies all meals of a type from the previous day ("repetir comida de ayer"). */
export async function repeatFromYesterday(date: IsoDate, mealType: MealType): Promise<number> {
  const yesterday = addDays(date, -1);
  const meals = (await repos.meals.list({ from: yesterday, to: yesterday })).filter(
    (m) => m.meal_type === mealType,
  );
  for (const m of meals) await duplicateMeal(m, date, mealType);
  return meals.length;
}
