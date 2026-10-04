import {
  matchScore,
  type AiItem,
  type EnrichedItem,
  type Food,
  type Nutrients,
} from './shared/index.ts';

/**
 * Hybrid nutrition pipeline: for each AI item try the regional table first, then USDA (cached),
 * and only fall back to the model's own per-100 g estimate. The chosen source is always recorded.
 * Database values are accepted only when they are plausible against the model's estimate, so a
 * wrong lookup ("milanesa" → "milanesa de soja") can't silently replace a good estimate.
 */
export interface FoodLookup {
  searchRegional(query: string): Promise<RegionalRow[]>;
  searchUsda(query: string): Promise<Food[]>;
}

export interface RegionalRow {
  id: string;
  name_es: string;
  name_en: string;
  name_pt: string;
  aliases: string[];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  sat_fat_g: number | null;
}

export const ENRICH = {
  regionalMinScore: 60,
  usdaMinScore: 40,
  /** Accept DB kcal/100 g within this ratio of the AI estimate. */
  regionalKcalRatio: [0.55, 1.8] as const,
  usdaKcalRatio: [0.65, 1.5] as const,
};

const n = (v: number | null | undefined) => (v == null ? undefined : Number(v));

function plausible(dbKcal: number, aiKcal: number, [lo, hi]: readonly [number, number]) {
  if (aiKcal <= 5) return dbKcal <= 20; // near-zero drinks / water
  const r = dbKcal / aiKcal;
  return r >= lo && r <= hi;
}

export function regionalToPer100(r: RegionalRow): Nutrients {
  return {
    kcal: Number(r.kcal),
    protein_g: Number(r.protein_g),
    carbs_g: Number(r.carbs_g),
    fat_g: Number(r.fat_g),
    fiber_g: n(r.fiber_g),
    sugar_g: n(r.sugar_g),
    sodium_mg: n(r.sodium_mg),
    sat_fat_g: n(r.sat_fat_g),
  };
}

export async function enrichItem(item: AiItem, lookup: FoodLookup): Promise<EnrichedItem> {
  const queries = [item.name, ...item.search_hints]
    .filter((q, i, a) => q && a.indexOf(q) === i)
    .slice(0, 3);
  const aiKcal = item.per_100g_estimate.kcal;
  const base = {
    display_name: item.name,
    name_en: item.name_en,
    grams: Math.round(item.estimated_grams),
    household_measure: item.household_measure,
    cooking_method: item.cooking_method,
    confidence: item.confidence,
    bbox: item.bbox,
  };

  // 1) Regional table
  try {
    const rows = (await Promise.all(queries.map((q) => lookup.searchRegional(q)))).flat();
    const ranked = rows
      .map((r) => ({
        r,
        score: Math.max(
          ...queries.map((q) => matchScore(q, [r.name_es, r.name_en, r.name_pt, ...r.aliases])),
        ),
      }))
      .filter(
        (x) =>
          x.score >= ENRICH.regionalMinScore &&
          plausible(Number(x.r.kcal), aiKcal, ENRICH.regionalKcalRatio),
      )
      .sort(
        (a, b) =>
          b.score - a.score ||
          Math.abs(Number(a.r.kcal) - aiKcal) - Math.abs(Number(b.r.kcal) - aiKcal),
      );
    const best = ranked[0];
    if (best)
      return {
        ...base,
        food_source: 'regional',
        food_id: best.r.id,
        per100g: regionalToPer100(best.r),
      };
  } catch {
    // fall through to USDA
  }

  // 2) USDA (English name)
  try {
    const foods = await lookup.searchUsda(item.name_en);
    const best = foods
      .map((f) => ({ f, score: matchScore(item.name_en, [f.name]) }))
      .filter(
        (x) =>
          x.score >= ENRICH.usdaMinScore &&
          plausible(x.f.per100g.kcal, aiKcal, ENRICH.usdaKcalRatio),
      )
      .sort((a, b) => b.score - a.score)[0];
    if (best) return { ...base, food_source: 'usda', food_id: best.f.id, per100g: best.f.per100g };
  } catch {
    // fall through to AI estimate
  }

  // 3) Model estimate
  return { ...base, food_source: 'ai', food_id: null, per100g: item.per_100g_estimate };
}

export function enrichItems(items: readonly AiItem[], lookup: FoodLookup): Promise<EnrichedItem[]> {
  return Promise.all(items.map((i) => enrichItem(i, lookup)));
}
