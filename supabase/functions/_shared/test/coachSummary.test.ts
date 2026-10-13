import { describe, expect, it } from 'vitest';

import { todayMealsLine } from '../coachSummary.ts';

describe('todayMealsLine', () => {
  it('says when nothing was logged', () => {
    expect(todayMealsLine([], [])).toBe('Eaten today: nothing logged yet.');
  });
  it('groups item names by meal and caps long meals', () => {
    const meals = [
      { id: 'a', meal_type: 'lunch' },
      { id: 'b', meal_type: 'snack' },
    ];
    const items = [
      ...Array.from({ length: 8 }, (_, i) => ({ meal_id: 'a', display_name: `item ${i}` })),
      { meal_id: 'b', display_name: '  Yogur \n natural ' },
    ];
    expect(todayMealsLine(meals, items)).toBe(
      'Eaten today: lunch: item 0, item 1, item 2, item 3, item 4, item 5 (+2); snack: Yogur natural.',
    );
  });
});
