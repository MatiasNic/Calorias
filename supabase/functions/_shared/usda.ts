import type { Food, Micronutrients, Nutrients } from './shared/index.ts';

/** USDA FoodData Central (public domain). Values from search results are per 100 g for Foundation/SR Legacy. */
const FDC_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

interface FdcNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
  unitName?: string;
}
export interface FdcFood {
  fdcId: number;
  description: string;
  dataType?: string;
  foodNutrients?: FdcNutrient[];
}

const MACROS: Record<number, keyof Nutrients> = {
  1008: 'kcal',
  1003: 'protein_g',
  1005: 'carbs_g',
  1004: 'fat_g',
  1079: 'fiber_g',
  2000: 'sugar_g',
  1093: 'sodium_mg',
  1258: 'sat_fat_g',
};
const ATWATER_KCAL = [2047, 2048];

/** Micronutrient ids we expose (key → FDC nutrient id). */
export const MICROS: Record<string, number> = {
  calcium_mg: 1087,
  iron_mg: 1089,
  magnesium_mg: 1090,
  potassium_mg: 1092,
  zinc_mg: 1095,
  vitamin_a_ug: 1106,
  vitamin_c_mg: 1162,
  vitamin_d_ug: 1114,
  vitamin_b12_ug: 1178,
  folate_ug: 1177,
};

export function normalizeFdcFood(f: FdcFood): Food | null {
  const per: Partial<Nutrients> = {};
  const micros: Micronutrients = {};
  let atwater: number | undefined;
  for (const n of f.foodNutrients ?? []) {
    if (n.nutrientId == null || n.value == null) continue;
    const key = MACROS[n.nutrientId];
    if (key) per[key] = n.value;
    if (ATWATER_KCAL.includes(n.nutrientId)) atwater = n.value;
    for (const [mk, id] of Object.entries(MICROS)) if (id === n.nutrientId) micros[mk] = n.value;
  }
  const protein = per.protein_g ?? 0;
  const carbs = per.carbs_g ?? 0;
  const fat = per.fat_g ?? 0;
  const kcal =
    per.kcal ??
    atwater ??
    (protein || carbs || fat ? protein * 4 + carbs * 4 + fat * 9 : undefined);
  if (kcal == null) return null;
  return {
    id: String(f.fdcId),
    source: 'usda',
    name: f.description.charAt(0) + f.description.slice(1).toLowerCase(),
    per100g: { ...per, kcal: Math.round(kcal), protein_g: protein, carbs_g: carbs, fat_g: fat },
    micros,
    servings: [],
    category: f.dataType ?? null,
    attribution: 'USDA FoodData Central',
  };
}

export async function searchUsda(
  query: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
  pageSize = 12,
): Promise<Food[]> {
  const url = `${FDC_SEARCH}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&dataType=${encodeURIComponent('Foundation,SR Legacy')}&pageSize=${pageSize}`;
  const res = await fetchFn(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`usda ${res.status}`);
  const json = (await res.json()) as { foods?: FdcFood[] };
  return (json.foods ?? []).map(normalizeFdcFood).filter((f): f is Food => f !== null);
}
