import { matchScore, normalizeText, type Food, type Nutrients } from '@plato/shared';
import regionalData from '@plato/shared/data/foods-regional.json';

import { currentLocale } from '@/i18n';
import { repos } from '@/services/db/repository';
import type { Serving } from '@/services/db/types';

interface RegionalRow {
  id: string;
  name_es: string;
  name_en: string;
  name_pt: string;
  aliases: string[];
  category: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  sat_fat_g: number;
  servings: Serving[];
  source: string;
}

export interface FoodOption extends Food {
  /** Stable key for lists/dedupe: `${source}:${id}`. */
  key: string;
  servings: Serving[];
  /** Last grams used (for recents). */
  lastGrams?: number;
}

export const normalize = normalizeText;

function regionalName(r: RegionalRow): string {
  const locale = currentLocale();
  return locale === 'en-US' ? r.name_en : locale === 'pt-BR' ? r.name_pt : r.name_es;
}

function regionalToFood(r: RegionalRow): FoodOption {
  const per100g: Nutrients = {
    kcal: r.kcal,
    protein_g: r.protein_g,
    carbs_g: r.carbs_g,
    fat_g: r.fat_g,
    fiber_g: r.fiber_g,
    sugar_g: r.sugar_g,
    sodium_mg: r.sodium_mg,
    sat_fat_g: r.sat_fat_g,
  };
  return {
    key: `regional:${r.id}`,
    id: r.id,
    source: 'regional',
    name: regionalName(r),
    per100g,
    servings: r.servings,
    category: r.category,
    attribution: r.source,
  };
}

const REGIONAL = regionalData as RegionalRow[];
const REGIONAL_INDEX = REGIONAL.map((r) => ({
  row: r,
  haystack: [r.name_es, r.name_en, r.name_pt, ...r.aliases].map(normalize),
}));

export function getRegionalFood(id: string): FoodOption | null {
  const r = REGIONAL.find((x) => x.id === id);
  return r ? regionalToFood(r) : null;
}

export function searchRegional(query: string, limit = 25): FoodOption[] {
  return REGIONAL_INDEX.map((x) => ({ x, score: matchScore(query, x.haystack) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.x.row.name_es.length - b.x.row.name_es.length)
    .slice(0, limit)
    .map((r) => regionalToFood(r.x.row));
}

export async function searchCustom(query: string): Promise<FoodOption[]> {
  const foods = await repos.foodsCustom.list();
  return foods
    .map((f) => ({ f, score: matchScore(query, [normalize(f.name), normalize(f.brand ?? '')]) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ f }) => ({
      key: `custom:${f.id}`,
      id: f.id,
      source: 'custom' as const,
      name: f.name,
      brand: f.brand,
      barcode: f.barcode,
      per100g: f.per100g,
      micros: f.micros,
      servings: f.servings,
    }));
}

/** Most recently used foods, derived from the local diary (works offline). */
export async function recentFoods(limit = 20): Promise<FoodOption[]> {
  const meals = await repos.meals.list();
  const seen = new Map<string, FoodOption>();
  for (const meal of [...meals].reverse()) {
    for (const item of meal.items) {
      const key = item.food_id
        ? `${item.food_source}:${item.food_id}`
        : `name:${normalize(item.display_name)}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        key,
        id: item.food_id ?? key,
        source: item.food_source,
        name: item.display_name,
        per100g: item.per100g,
        servings: [],
        lastGrams: item.grams,
      });
      if (seen.size >= limit) return [...seen.values()];
    }
  }
  return [...seen.values()];
}

export function dedupeFoods(lists: readonly FoodOption[][]): FoodOption[] {
  const map = new Map<string, FoodOption>();
  for (const list of lists) for (const f of list) if (!map.has(f.key)) map.set(f.key, f);
  return [...map.values()];
}

export { matchScore };
export const REGIONAL_COUNT = REGIONAL.length;
