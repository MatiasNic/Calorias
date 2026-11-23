import { isValidPulledRecord } from '@/services/sync/schemas';
import { accountAdapters } from '@/services/sync/adapters/account';
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

describe('pull order', () => {
  // A query stub that records the columns the pull sorts by.
  const recordOrder = () => {
    const order: string[] = [];
    const q = {
      select: () => q,
      eq: () => q,
      gt: () => q,
      order: (c: string) => (order.push(c), q),
      range: () => Promise.resolve({ data: [], error: null }),
    };
    return { order, sb: { from: () => q } as never };
  };

  it.each(['streaks', 'notification_settings'] as const)(
    '%s sorts by its primary key (user_id), not a missing id column',
    async (collection) => {
      const { order, sb } = recordOrder();
      await accountAdapters[collection].pull(sb, 'u1', null, 0);
      expect(order).toEqual(['updated_at', 'user_id']);
    },
  );
});
