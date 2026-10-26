import { describe, expect, it } from 'vitest';

import { waterReminderHours } from '../src/reminders.ts';

describe('waterReminderHours', () => {
  it('spaces reminders inside the window, ends included', () => {
    expect(waterReminderHours(9, 21, 2)).toEqual([9, 11, 13, 15, 17, 19, 21]);
    expect(waterReminderHours(9, 20, 3)).toEqual([9, 12, 15, 18]);
  });

  it('never loops on a zero or bogus step and clamps to the day', () => {
    expect(waterReminderHours(22, 30, 0)).toEqual([22, 23]);
    expect(waterReminderHours(10, 12, Number.NaN)).toEqual([10, 11, 12]);
  });

  it('is empty for an inverted window', () => {
    expect(waterReminderHours(21, 9, 2)).toEqual([]);
  });
});
