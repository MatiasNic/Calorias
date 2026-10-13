import { isValidPulledRecord } from '@/services/sync/schemas';
import { groupByKeys } from '@/services/sync/adapters/shared';

describe('groupByKeys', () => {
  it('keeps rows with the same keys together and splits the rest', () => {
    const groups = groupByKeys([
      { id: 1, a: 1 },
      { id: 2, a: 2 },
      { id: 3, b: 1 },
      { a: 3, id: 4 },
    ]);
    expect(groups.map((g) => g.map((r) => r.id))).toEqual([[1, 2, 4], [3]]);
  });
  it('treats undefined values like missing keys', () => {
    expect(groupByKeys([{ id: 1, a: undefined }, { id: 2 }])).toHaveLength(1);
  });
});

describe('pulled record validation', () => {
  const n = { kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 3 };
  const meal = {
    id: 'm1',
    local_date: '2026-10-13',
    eaten_at: '2026-10-13T12:00:00Z',
    meal_type: 'lunch',
    items: [{ display_name: 'Milanesa', grams: 150, per100g: n, nutrients: n }],
    totals: n,
  };
  it('accepts well-formed records', () => {
    expect(isValidPulledRecord('meals', meal)).toBe(true);
    expect(isValidPulledRecord('water', { id: 'w', local_date: '2026-10-13', ml: 250 })).toBe(true);
  });
  it('rejects malformed JSON columns', () => {
    expect(isValidPulledRecord('meals', { ...meal, items: [{ display_name: 'x' }] })).toBe(false);
    expect(isValidPulledRecord('meals', { ...meal, items: 'nope' })).toBe(false);
    expect(
      isValidPulledRecord('workouts', {
        id: 'w',
        local_date: '2026-10-13',
        duration_min: 30,
        kcal: 200,
        exercises: [{ key: 'squat', sets: [{ reps: 'ten', kg: 50 }] }],
      }),
    ).toBe(false);
  });
});
