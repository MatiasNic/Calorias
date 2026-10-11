import { dailySummary, type AnalyzeResponse } from '@plato/shared';

import { appendDictation } from '../scan/dictationText';
import { applyLocalCorrection } from '../scan/localCorrection';
import { analysisToItems } from '../scan/toDraft';
import {
  applyCookingMethod,
  COOKING_CHOICES,
  cookingChoicesFor,
  FRYING_FAT_G_PER_100G,
  isCookable,
} from '../diary/cooking';
import { makeItem, mealTotals, withGrams } from '../diary/mealMath';
import {
  matchScore,
  normalize,
  searchRegional,
  getRegionalFood,
  REGIONAL_COUNT,
} from '../foods/search';
import { goalForDate, DEFAULT_GOAL } from '../goals/hooks';
import { pickInsight } from '../habits/insights';
import { offToFood } from '../foods/openFoodFacts';

describe('regional food search', () => {
  it('ships at least 150 regional foods', () => {
    expect(REGIONAL_COUNT).toBeGreaterThanOrEqual(150);
  });
  it('normalizes accents and case', () => {
    expect(normalize('Ñoquis de PAPÁ')).toBe('noquis de papa');
  });
  it('ranks prefix matches first and matches aliases', () => {
    const r = searchRegional('milanesa');
    expect(r[0]?.name.toLowerCase()).toContain('milanesa');
    expect(searchRegional('pure').some((f) => f.id === 'pure_papa')).toBe(true);
    expect(searchRegional('chori').map((f) => f.id)).toEqual(
      expect.arrayContaining(['choripan', 'chorizo_parrilla']),
    );
  });
  it('scores token matches', () => {
    expect(matchScore('carne empanada', ['empanada de carne al horno'])).toBeGreaterThan(0);
    expect(matchScore('xyz', ['banana'])).toBe(0);
  });
  it('exposes servings for regional foods', () => {
    expect(getRegionalFood('empanada_carne_horno')?.servings[0]).toEqual({
      unit: 'unit',
      grams: 120,
    });
  });
});

describe('meal math', () => {
  const food = {
    id: 'x',
    source: 'regional' as const,
    name: 'Milanesa',
    per100g: { kcal: 270, protein_g: 18, carbs_g: 14, fat_g: 16 },
  };
  it('creates items and rescales them', () => {
    const item = makeItem(food, 150);
    expect(item.nutrients.kcal).toBe(405);
    const bigger = withGrams(item, 300);
    expect(bigger.nutrients.kcal).toBe(810);
    expect(bigger.user_edited).toBe(true);
  });
  it('totals always equal the sum of items', () => {
    const items = [
      makeItem(food, 150),
      makeItem({ ...food, per100g: { kcal: 105, protein_g: 2, carbs_g: 15, fat_g: 4 } }, 200),
    ];
    const totals = mealTotals(items);
    expect(totals.kcal).toBe(items[0]!.nutrients.kcal + items[1]!.nutrients.kcal);
  });
});

describe('cooking method adjustment', () => {
  it('adds fat when switching to fried and removes it back', () => {
    const base = {
      ...makeItem(
        {
          id: 'y',
          source: 'ai',
          name: 'Pollo',
          per100g: { kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
        },
        100,
      ),
      cooking_method: 'grilled' as const,
    };
    const fried = applyCookingMethod(base, 'fried');
    expect(fried.per100g.fat_g).toBeCloseTo(3.6 + FRYING_FAT_G_PER_100G);
    expect(fried.nutrients.kcal).toBe(165 + FRYING_FAT_G_PER_100G * 9);
    const back = applyCookingMethod(fried, 'baked');
    expect(back.per100g.fat_g).toBeCloseTo(3.6);
  });
  it('never makes fat negative', () => {
    const lean = {
      ...makeItem(
        {
          id: 'z',
          source: 'ai',
          name: 'Papa',
          per100g: { kcal: 87, protein_g: 2, carbs_g: 20, fat_g: 0.1 },
        },
        100,
      ),
      cooking_method: 'fried' as const,
    };
    expect(applyCookingMethod(lean, 'boiled').per100g.fat_g).toBe(0);
  });
});

describe('cooking question in the review', () => {
  const item = (cooking_method?: 'raw' | 'fried' | 'stewed' | 'unknown') => ({
    ...makeItem(
      {
        id: 'm',
        source: 'ai',
        name: 'Milanesa',
        per100g: { kcal: 250, protein_g: 20, carbs_g: 12, fat_g: 13 },
      },
      150,
    ),
    cooking_method,
  });
  it('asks only about cooked or unsure items', () => {
    expect(isCookable(item('fried'))).toBe(true);
    expect(isCookable(item('unknown'))).toBe(true);
    expect(isCookable(item('raw'))).toBe(false);
    expect(isCookable(item())).toBe(false);
  });
  it("keeps the AI's method among the choices", () => {
    expect(cookingChoicesFor(item('fried'))).toEqual(COOKING_CHOICES);
    expect(cookingChoicesFor(item('unknown'))).toEqual(COOKING_CHOICES);
    expect(cookingChoicesFor(item('stewed'))).toEqual(['stewed', ...COOKING_CHOICES]);
  });
});

describe('goalForDate', () => {
  it('uses the latest goal effective on or before the date', () => {
    const g1 = { ...DEFAULT_GOAL, id: 'a', kcal: 2000, effective_from: '2026-09-01' };
    const g2 = { ...DEFAULT_GOAL, id: 'b', kcal: 1800, effective_from: '2026-10-01' };
    expect(goalForDate([g1, g2], '2026-09-15').kcal).toBe(2000);
    expect(goalForDate([g1, g2], '2026-10-04').kcal).toBe(1800);
  });
});

describe('pickInsight', () => {
  const target = { kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 28 };
  it('suggests starting when nothing is logged', () => {
    expect(pickInsight(dailySummary([], target), 0, 2000, 9).kind).toBe('start_day');
  });
  it('flags a protein gap in the afternoon', () => {
    const s = dailySummary(
      [{ meal_type: 'lunch', totals: { kcal: 900, protein_g: 40, carbs_g: 100, fat_g: 30 } }],
      target,
    );
    expect(pickInsight(s, 2000, 2000, 16)).toEqual({ kind: 'protein_gap', grams: 110 });
  });
  it('uses neutral wording when over target', () => {
    const s = dailySummary(
      [{ meal_type: 'dinner', totals: { kcal: 2600, protein_g: 150, carbs_g: 300, fat_g: 90 } }],
      target,
    );
    expect(pickInsight(s, 2000, 2000, 22).kind).toBe('over_target');
  });
});

describe('Open Food Facts mapping', () => {
  it('maps per-100 g nutriments and serving size', () => {
    const f = offToFood({
      code: '7790895000997',
      product_name: 'Galletitas',
      brands: 'Marca, Otra',
      serving_quantity: '30',
      serving_size: '3 galletitas (30 g)',
      nutriments: {
        'energy-kcal_100g': 450,
        proteins_100g: 7,
        carbohydrates_100g: 70,
        fat_100g: 15,
        sodium_100g: 0.4,
      },
    });
    expect(f).toMatchObject({
      source: 'off',
      brand: 'Marca',
      per100g: { kcal: 450, sodium_mg: 400 },
      servings: [{ unit: 'serving', grams: 30 }],
    });
  });
  it('returns null without energy data', () => {
    expect(offToFood({ code: '1', nutriments: {} })).toBeNull();
  });
});

describe('appendDictation', () => {
  it('adds a new recording after the existing text', () => {
    expect(appendDictation('dos empanadas de carne', ' y una coca zero ')).toBe(
      'dos empanadas de carne y una coca zero',
    );
  });
  it('handles empty sides', () => {
    expect(appendDictation('', 'milanesa')).toBe('milanesa');
    expect(appendDictation('milanesa ', '')).toBe('milanesa');
  });
});

describe('local (demo) correction', () => {
  const per = { kcal: 250, protein_g: 18, carbs_g: 12, fat_g: 14 };
  const milanesa = makeItem(
    { id: null, source: 'ai', name: 'Milanesa de carne', per100g: per },
    150,
    {
      cooking_method: 'fried',
    },
  );
  const pure = makeItem(
    { id: null, source: 'ai', name: 'Puré de papa', per100g: { ...per, kcal: 105, fat_g: 4 } },
    200,
    { cooking_method: 'boiled' },
  );
  const deps = { parse: () => [], oil: () => null };

  it('removes, re-cooks and resizes what the user says', () => {
    const out = applyLocalCorrection([milanesa, pure], 'era al horno y sin puré', deps);
    expect(out.map((i) => i.display_name)).toEqual(['Milanesa de carne']);
    expect(out[0]!.cooking_method).toBe('baked');
    expect(out[0]!.nutrients.fat_g).toBeLessThan(milanesa.nutrients.fat_g);
    const half = applyLocalCorrection([milanesa, pure], 'media milanesa', deps);
    expect(half[0]!.grams).toBe(75);
    expect(half[1]!.grams).toBe(200);
  });

  it('adds oil spoons and new foods', () => {
    const oil = makeItem(
      {
        id: 'aceite',
        source: 'regional',
        name: 'Aceite',
        per100g: { kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100 },
      },
      13,
    );
    const flan = makeItem({ id: null, source: 'ai', name: 'Flan', per100g: per }, 120);
    const out = applyLocalCorrection([pure], '2 cucharadas de aceite', {
      parse: () => [],
      oil: () => oil,
    });
    expect(out[1]!.grams).toBe(26);
    const more = applyLocalCorrection([pure], 'y también un flan', {
      parse: () => [flan],
      oil: () => null,
    });
    expect(more.map((i) => i.display_name)).toEqual(['Puré de papa', 'Flan']);
  });
});

describe('several meals in one description', () => {
  const enriched = (name: string, meal: 'breakfast' | 'dinner' | null) => ({
    display_name: name,
    name_en: name,
    grams: 100,
    household_measure: '1 porción',
    cooking_method: 'unknown' as const,
    confidence: 0.8,
    food_source: 'ai' as const,
    food_id: null,
    per100g: { kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 },
    meal_type: meal,
  });
  const response = (items: ReturnType<typeof enriched>[]): AnalyzeResponse => ({
    scan_id: null,
    cached: false,
    is_food: true,
    dish_name: null,
    items,
    hidden_ingredients_question: null,
    quick_answers: [],
    notes: null,
    model: 'test',
    quota: { used: 1, limit: 5, remaining: 4 },
  });

  it('maps each item to its meal only when there are several', () => {
    const two = analysisToItems(
      response([enriched('Café', 'breakfast'), enriched('Pizza', 'dinner')]),
    );
    expect(Object.values(two.itemMeals)).toEqual(['breakfast', 'dinner']);
    const one = analysisToItems(
      response([enriched('Café', 'breakfast'), enriched('Tostada', 'breakfast')]),
    );
    expect(one.itemMeals).toEqual({});
  });
});
