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
/** Deterministic demo products (E2E tests and store reviewers without network). */
export const DEMO_BARCODES: Record<string, FoodOption> = {
  '7790000000017': {
    key: 'off:7790000000017',
    id: '7790000000017',
    source: 'off',
    name: 'Alfajor de chocolate (demo)',
    brand: 'Demo',
    barcode: '7790000000017',
    per100g: {
      kcal: 430,
      protein_g: 5.5,
      carbs_g: 62,
      fat_g: 18,
      fiber_g: 2,
      sugar_g: 40,
      sodium_mg: 180,
      sat_fat_g: 10,
    },
    servings: [{ unit: 'unit', grams: 50 }],
    attribution: 'Open Food Facts (ODbL)',
  },
};

export async function lookupBarcode(barcode: string): Promise<FoodOption | null> {
  if (env.useMocks)
    return DEMO_BARCODES[barcode] ?? lookupBarcodeOffDirect(barcode).catch(() => null);
  const res = await invokeFunction(
    'barcode-lookup',
    { barcode },
    z.object({ food: FoodSchema.nullable() }),
  );
  return res.food ? toOption(res.food) : null;
}
