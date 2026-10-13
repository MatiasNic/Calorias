import type { CoachDish } from '@bocado/shared';

import { historyForServer } from '@/features/coach/conversation';
import { boldRuns, dishTotals } from '@/features/coach/logic';

const dish: CoachDish = {
  name: 'Pollo con arroz',
  meal_type: 'dinner',
  minutes: 20,
  steps: [],
  items: [
    {
      display_name: 'Pollo',
      name_en: 'chicken',
      grams: 150,
      household_measure: '1 pechuga',
      cooking_method: 'grilled',
      confidence: 0.8,
      food_source: 'regional',
      food_id: 'pollo',
      per100g: { kcal: 160, protein_g: 30, carbs_g: 0, fat_g: 4 },
    },
    {
      display_name: 'Arroz',
      name_en: 'rice',
      grams: 100,
      household_measure: '1/2 taza',
      cooking_method: 'boiled',
      confidence: 0.8,
      food_source: 'ai',
      food_id: null,
      per100g: { kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 },
    },
  ],
};

describe('coach', () => {
  it('splits **bold** runs', () => {
    expect(boldRuns('Tocá **Registrar** y listo')).toEqual([
      ['Tocá ', false],
      ['Registrar', true],
      [' y listo', false],
    ]);
    expect(boldRuns('sin marcas')).toEqual([['sin marcas', false]]);
  });
  it('sums a dish per portion', () => {
    const n = dishTotals(dish);
    expect(Math.round(n.kcal)).toBe(370);
    expect(Math.round(n.protein_g)).toBe(48);
  });
  it('tells the model which dishes it already proposed', () => {
    expect(
      historyForServer([
        { id: '1', role: 'user', content: 'Tengo pollo' },
        { id: '2', role: 'assistant', content: 'Mirá:', dishes: [dish] },
      ]),
    ).toEqual([
      { role: 'user', content: 'Tengo pollo' },
      { role: 'assistant', content: 'Mirá:\n[Dishes proposed: Pollo con arroz]' },
    ]);
  });
});
