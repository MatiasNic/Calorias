import {
  matchScore,
  type AiAnalysis,
  type AnalyzeResponse,
  type EnrichedItem,
} from '@bocado/shared';

import { searchRegional } from '@/features/foods/search';

/**
 * Demo-mode stand-ins for the server pipeline. Loaded lazily (`await import('./mock')`) so the
 * regional food search only gets pulled in when a mocked analysis actually runs.
 */

/** Local stand-in for the server enrichment pipeline (regional table, plausibility check). */
export function enrichLocally(items: AiAnalysis['items']): EnrichedItem[] {
  return items.map((it) => {
    const aiKcal = it.per_100g_estimate.kcal;
    const queries = [it.name, ...it.search_hints];
    const plausible = (kcal: number) =>
      aiKcal <= 5 ? kcal <= 20 : kcal / aiKcal >= 0.55 && kcal / aiKcal <= 1.8;
    // Same ranking as the server: best name match first, then closest kcal to the AI estimate.
    const match = queries
      .flatMap((q) => searchRegional(q, 5))
      .map((f) => ({ f, score: Math.max(...queries.map((q) => matchScore(q, [f.name]))) }))
      .filter((x) => x.score >= 60 && plausible(x.f.per100g.kcal))
      .sort(
        (a, b) =>
          b.score - a.score ||
          Math.abs(a.f.per100g.kcal - aiKcal) - Math.abs(b.f.per100g.kcal - aiKcal),
      )[0]?.f;
    return {
      display_name: it.name,
      name_en: it.name_en,
      grams: Math.round(it.estimated_grams),
      household_measure: it.household_measure,
      cooking_method: it.cooking_method,
      confidence: it.confidence,
      food_source: match ? 'regional' : 'ai',
      food_id: match?.id ?? null,
      per100g: match
        ? { ...match.per100g, fiber_g: match.per100g.fiber_g ?? 0 }
        : it.per_100g_estimate,
      bbox: it.bbox,
      meal_type: it.meal_type,
    };
  });
}

export function mockResponse(
  analysis: AiAnalysis,
  quota: AnalyzeResponse['quota'],
): AnalyzeResponse {
  return {
    scan_id: null,
    cached: false,
    is_food: analysis.is_food,
    dish_name: analysis.dish_name,
    items: enrichLocally(analysis.items),
    hidden_ingredients_question: analysis.hidden_ingredients_question,
    quick_answers: analysis.quick_answers,
    notes: analysis.notes,
    model: 'demo',
    quota,
  };
}
