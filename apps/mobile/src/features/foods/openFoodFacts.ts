import type { Nutrients } from '@plato/shared';

import type { FoodOption } from './search';

/**
 * Minimal Open Food Facts client (used directly only in demo mode; production goes through the
 * `barcode-lookup` Edge Function, which caches results). Data © Open Food Facts contributors, ODbL.
 */
const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'code,product_name,product_name_es,brands,nutriments,serving_quantity,serving_size';
export const OFF_ATTRIBUTION = 'Open Food Facts (ODbL)';

interface OffProduct {
  code: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const n = (v: unknown) => (v == null || v === '' ? undefined : Number(v));

export function offToFood(p: OffProduct): FoodOption | null {
  const nm = p.nutriments ?? {};
  const kcal =
    n(nm['energy-kcal_100g']) ??
    (n(nm['energy_100g']) != null ? n(nm['energy_100g'])! / 4.184 : undefined);
  if (kcal == null) return null;
  const per100g: Nutrients = {
    kcal: Math.round(kcal),
    protein_g: n(nm['proteins_100g']) ?? 0,
    carbs_g: n(nm['carbohydrates_100g']) ?? 0,
    fat_g: n(nm['fat_100g']) ?? 0,
    fiber_g: n(nm['fiber_100g']),
    sugar_g: n(nm['sugars_100g']),
    sodium_mg: n(nm['sodium_100g']) != null ? Math.round(n(nm['sodium_100g'])! * 1000) : undefined,
    sat_fat_g: n(nm['saturated-fat_100g']),
  };
  const serving = n(p.serving_quantity);
  return {
    key: `off:${p.code}`,
    id: p.code,
    source: 'off',
    name: (p.product_name_es || p.product_name || p.code).trim(),
    brand: p.brands?.split(',')[0]?.trim() ?? null,
    barcode: p.code,
    per100g,
    servings:
      serving && serving > 0 ? [{ unit: 'serving', grams: serving, label: p.serving_size }] : [],
    attribution: OFF_ATTRIBUTION,
  };
}

export async function lookupBarcodeOffDirect(barcode: string): Promise<FoodOption | null> {
  const res = await fetch(`${OFF_URL}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
    headers: { 'User-Agent': 'Plato/0.1 (soporte@plato.app)' },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { status: number; product?: OffProduct };
  return json.status === 1 && json.product
    ? offToFood({ ...json.product, code: json.product.code ?? barcode })
    : null;
}
