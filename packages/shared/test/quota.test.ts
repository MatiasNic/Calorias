import { describe, expect, it } from 'vitest';
import { checkQuota, hasFeature, PLANS, remainingToday } from '../src/index.ts';

describe('checkQuota', () => {
  it('allows 3 free photo scans per day', () => {
    expect(checkQuota('free', 'photo_scan', { used: 0 })).toMatchObject({
      allowed: true,
      remaining: 2,
      bucket: 'daily',
    });
    expect(checkQuota('free', 'photo_scan', { used: 2 })).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(checkQuota('free', 'photo_scan', { used: 3 })).toMatchObject({
      allowed: false,
      remaining: 0,
      bucket: null,
    });
  });
  it('consumes purchased scan packs after the daily allowance', () => {
    expect(checkQuota('free', 'photo_scan', { used: 3, bonusCredits: 5 })).toMatchObject({
      allowed: true,
      bucket: 'bonus',
      remaining: 4,
    });
  });
  it('gives free users one lifetime coach message', () => {
    expect(checkQuota('free', 'coach_message', { used: 0, lifetimeUsed: 0 })).toMatchObject({
      allowed: true,
      bucket: 'trial',
    });
    expect(checkQuota('free', 'coach_message', { used: 1, lifetimeUsed: 1 }).allowed).toBe(false);
  });
  it('applies the premium fair-use cap', () => {
    expect(checkQuota('premium', 'photo_scan', { used: 49 }).allowed).toBe(true);
    expect(checkQuota('premium', 'photo_scan', { used: 50 }).allowed).toBe(false);
  });
  it('limits free text queries to 5', () => {
    expect(PLANS.free.daily.text_query).toBe(5);
    expect(checkQuota('free', 'text_query', { used: 5 }).allowed).toBe(false);
  });
  it('computes remaining for display', () => {
    expect(remainingToday('free', 'photo_scan', 1)).toBe(2);
    expect(remainingToday('free', 'photo_scan', 4, 10)).toBe(10);
  });
  it('gates premium features', () => {
    expect(hasFeature('free', 'adaptiveGoal')).toBe(false);
    expect(hasFeature('premium', 'adaptiveGoal')).toBe(true);
  });
});
