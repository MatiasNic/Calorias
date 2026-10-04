import { CONFIDENCE_LEVELS } from '../constants.ts';
import type { Micronutrients, Nutrients } from '../schemas/nutrients.ts';

type NumericKey = keyof Nutrients;
const KEYS: readonly NumericKey[] = [
  'kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'sodium_mg',
  'sat_fat_g',
];

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Rounds nutrient values for display/storage: kcal to integers, the rest to 1 decimal. */
export function roundNutrients(n: Nutrients): Nutrients {
  const out: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const k of KEYS) {
    const v = n[k];
    if (v === undefined) continue;
    out[k] = k === 'kcal' || k === 'sodium_mg' ? Math.round(v) : round(v, 1);
  }
  return out;
}

/** Scales per-100 g values to the given grams. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = Math.max(0, grams) / 100;
  const out: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const k of KEYS) {
    const v = per100g[k];
    if (v === undefined) continue;
    out[k] = v * factor;
  }
  return roundNutrients(out);
}

export function scaleMicros(per100g: Micronutrients | undefined, grams: number): Micronutrients {
  if (!per100g) return {};
  const factor = Math.max(0, grams) / 100;
  return Object.fromEntries(Object.entries(per100g).map(([k, v]) => [k, round(v * factor, 2)]));
}

/** Sums nutrient totals. Optional fields are summed only if present on at least one item. */
export function sumNutrients(items: readonly Nutrients[]): Nutrients {
  const out: Nutrients = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const item of items) {
    for (const k of KEYS) {
      const v = item[k];
      if (v === undefined) continue;
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return roundNutrients(out);
}

export function sumMicros(items: readonly (Micronutrients | undefined)[]): Micronutrients {
  const out: Micronutrients = {};
  for (const m of items) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) out[k] = round((out[k] ?? 0) + v, 2);
  }
  return out;
}

/** Derives per-100 g values from an absolute amount (inverse of scaleNutrients). */
export function per100FromTotals(totals: Nutrients, grams: number): Nutrients {
  if (grams <= 0) return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  return scaleNutrients(totals, (100 * 100) / grams);
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function confidenceLevel(confidence: number | null | undefined): ConfidenceLevel {
  if (confidence == null) return 'high';
  if (confidence >= CONFIDENCE_LEVELS.high) return 'high';
  if (confidence >= CONFIDENCE_LEVELS.medium) return 'medium';
  return 'low';
}

/** Clamp grams to a sane editable range. */
export function clampGrams(grams: number): number {
  if (!Number.isFinite(grams)) return 0;
  return Math.min(5000, Math.max(0, Math.round(grams)));
}
