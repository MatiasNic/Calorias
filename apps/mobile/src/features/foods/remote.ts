import { FoodSchema, type Food } from '@plato/shared';
import { z } from 'zod';

import { env } from '@/config/env';
import { invokeFunction } from '@/services/api/client';
import { lookupBarcodeOffDirect } from './openFoodFacts';
import type { FoodOption } from './search';

const toOption = (f: Food): FoodOption => ({
  ...f,
  key: `${f.source}:${f.id}`,
  servings: f.servings ?? [],
});

/** USDA FoodData Central search through the `food-search` Edge Function (key stays on server). */
export async function searchRemoteFoods(query: string): Promise<FoodOption[]> {
  if (env.useMocks || query.trim().length < 3) return [];
  const res = await invokeFunction(
    'food-search',
    { query },
    z.object({ foods: z.array(FoodSchema) }),
  );
  return res.foods.map(toOption);
}

/** Barcode → product. Server function caches Open Food Facts; mock mode calls OFF directly. */
export async function lookupBarcode(barcode: string): Promise<FoodOption | null> {
  if (env.useMocks) return lookupBarcodeOffDirect(barcode);
  const res = await invokeFunction(
    'barcode-lookup',
    { barcode },
    z.object({ food: FoodSchema.nullable() }),
  );
  return res.food ? toOption(res.food) : null;
}
