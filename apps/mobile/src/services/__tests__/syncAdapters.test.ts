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
