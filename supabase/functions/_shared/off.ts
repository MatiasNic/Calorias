import type { Food, Nutrients } from './shared/index.ts';

/** Open Food Facts product lookup. Data © Open Food Facts contributors, ODbL — attribution required. */
const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS =
  'code,product_name,product_name_es,product_name_pt,product_name_en,brands,nutriments,serving_quantity,serving_size';
export const OFF_ATTRIBUTION = 'Open Food Facts (ODbL)';

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  product_name_pt?: string;
  product_name_en?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) =>
  v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v);

export function normalizeOffProduct(p: OffProduct, barcode: string, locale = 'es'): Food | null {
  const n = p.nutriments ?? {};
  const kj = num(n['energy_100g']);
  const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : undefined);
  if (kcal == null) return null;
  const sodium = num(n['sodium_100g']);
  const per100g: Nutrients = {
    kcal: Math.round(kcal),
    protein_g: num(n['proteins_100g']) ?? 0,
    carbs_g: num(n['carbohydrates_100g']) ?? 0,
    fat_g: num(n['fat_100g']) ?? 0,
    fiber_g: num(n['fiber_100g']),
    sugar_g: num(n['sugars_100g']),
    sodium_mg: sodium != null ? Math.round(sodium * 1000) : undefined,
    sat_fat_g: num(n['saturated-fat_100g']),
  };
  const localized = locale.startsWith('pt')
    ? p.product_name_pt
    : locale.startsWith('en')
      ? p.product_name_en
      : p.product_name_es;
  const serving = num(p.serving_quantity);
  return {
    id: barcode,
    source: 'off',
    name: (localized || p.product_name || barcode).trim(),
    brand: p.brands?.split(',')[0]?.trim() || null,
    barcode,
    per100g,
    servings:
      serving && serving > 0 ? [{ unit: 'serving', grams: serving, label: p.serving_size }] : [],
    attribution: OFF_ATTRIBUTION,
  };
}

export async function fetchOffProduct(
  barcode: string,
  fetchFn: typeof fetch = fetch,
): Promise<OffProduct | null> {
  const res = await fetchFn(`${OFF_URL}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
    headers: { 'User-Agent': 'Plato/0.1 (soporte@plato.app)' },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`off ${res.status}`);
  const json = (await res.json()) as { status: number; product?: OffProduct };
  return json.status === 1 && json.product ? json.product : null;
}
