import { describe, expect, it } from 'vitest';

import { estimateCostUsd } from '../ai/cost.ts';
import { enrichItem } from '../enrich.ts';
import { analyzeMeal } from '../handlers/analyzeMeal.ts';
import { analyzeText } from '../handlers/analyzeText.ts';
import { coachChat, mealPlan } from '../handlers/coach.ts';
import { deleteAccount, exportData, quotaStatus } from '../handlers/account.ts';
import { revenuecatWebhook, stateFor } from '../handlers/revenuecat.ts';
import { handle } from '../http.ts';
import { MOCK_PLATES } from '../shared/index.ts';
import { fakeAi, makeDeps, post, REGIONAL, SHA, USER, type AiBehavior } from './fakes.ts';

const mealBody = { photo_path: `${USER}/p1.jpg`, image_sha256: SHA, locale: 'es-AR' };
const call = (fn: (r: Request) => Promise<Response>, req: Request) => handle(fn)(req);

async function body(res: Response) {
  return (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('analyze-meal', () => {
  it('rejects missing or invalid JWT', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    expect((await call((r) => analyzeMeal(r, deps), post(mealBody, null))).status).toBe(401);
    expect((await call((r) => analyzeMeal(r, deps), post(mealBody, 'bad'))).status).toBe(401);
  });

  it('validates input with Zod', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    const res = await call((r) => analyzeMeal(r, deps), post({ photo_path: 'x' }));
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('INVALID_INPUT');
    expect((await call((r) => analyzeMeal(r, deps), post('{not json'))).status).toBe(400);
  });

  it('refuses photos outside the caller folder', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    const res = await call(
      (r) => analyzeMeal(r, deps),
      post({ ...mealBody, photo_path: 'someone-else/p.jpg' }),
    );
    expect(res.status).toBe(403);
  });

  it('analyzes, enriches from the regional table and logs cost', async () => {
    const ai = fakeAi(() => 'ok');
    const { deps, state } = makeDeps(ai);
    const res = await call((r) => analyzeMeal(r, deps), post(mealBody));
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.cached).toBe(false);
    expect(json.items[0]).toMatchObject({
      food_source: 'regional',
      food_id: 'milanesa_carne_frita',
      grams: 160,
    });
    expect(json.items[1]).toMatchObject({ food_source: 'regional', food_id: 'pure_papa' });
    expect(json.quota).toEqual({ used: 1, limit: 3, remaining: 2 });
    expect(ai.calls).toEqual(['claude-haiku-4-5']);
    expect(state.scans[0]).toMatchObject({
      status: 'ok',
      input_tokens: 1200,
      output_tokens: 300,
      cost_usd: estimateCostUsd('claude-haiku-4-5', 1200, 300),
    });
  });

  it('uses the precision model for premium users', async () => {
    const ai = fakeAi(() => 'ok');
    const { deps } = makeDeps(ai, { plan: 'premium' });
    await call((r) => analyzeMeal(r, deps), post(mealBody));
    expect(ai.calls).toEqual(['claude-sonnet-5-5']);
  });

  it('returns 402 QUOTA_EXCEEDED after 3 free scans', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    for (let i = 0; i < 3; i++) {
      const res = await call(
        (r) => analyzeMeal(r, deps),
        post({ ...mealBody, image_sha256: String(i).repeat(64) }),
      );
      expect(res.status).toBe(200);
    }
    const res = await call(
      (r) => analyzeMeal(r, deps),
      post({ ...mealBody, image_sha256: 'f'.repeat(64) }),
    );
    expect(res.status).toBe(402);
    expect((await body(res)).error).toMatchObject({
      code: 'QUOTA_EXCEEDED',
      details: { limit: 3, plan: 'free' },
    });
  });

  it('returns cached results for a duplicate image without consuming quota', async () => {
    const ai = fakeAi(() => 'ok');
    const { deps, state } = makeDeps(ai);
    await call((r) => analyzeMeal(r, deps), post(mealBody));
    const res = await call((r) => analyzeMeal(r, deps), post(mealBody));
    expect((await body(res)).cached).toBe(true);
    expect(ai.calls).toHaveLength(1);
    expect([...state.usage.values()][0]!.photo_scans).toBe(1);
  });

  it.each<[AiBehavior, number, string]>([
    ['timeout', 504, 'AI_TIMEOUT'],
    ['invalid', 502, 'AI_INVALID_RESPONSE'],
    ['refusal', 502, 'AI_INVALID_RESPONSE'],
  ])('maps AI %s to %i and refunds the quota', async (behavior, status, code) => {
    const { deps, state } = makeDeps(fakeAi(() => behavior));
    const res = await call((r) => analyzeMeal(r, deps), post(mealBody));
    expect(res.status).toBe(status);
    expect((await body(res)).error.code).toBe(code);
    expect([...state.usage.values()][0]!.photo_scans).toBe(0);
    expect(state.scans[0]?.status).not.toBe('ok');
  });

  it('does not charge when the photo is not food', async () => {
    const { deps, state } = makeDeps(fakeAi(() => 'not_food'));
    const res = await call((r) => analyzeMeal(r, deps), post(mealBody));
    const json = await body(res);
    expect(json).toMatchObject({ is_food: false, items: [] });
    expect([...state.usage.values()][0]!.photo_scans).toBe(0);
    expect(state.scans[0]?.status).toBe('not_food');
  });

  it('deletes the photo when the user opted out of storing photos', async () => {
    const { deps, state } = makeDeps(fakeAi(() => 'ok'));
    await call((r) => analyzeMeal(r, deps), post({ ...mealBody, keep_photo: false }));
    expect(state.removed).toContain(`${USER}/p1.jpg`);
  });

  it('pauses free users when the daily AI budget is exceeded', async () => {
    const { deps } = makeDeps(
      fakeAi(() => 'ok'),
      { costToday: 25 },
    );
    const res = await call((r) => analyzeMeal(r, deps), post(mealBody));
    expect(res.status).toBe(503);
    const premium = makeDeps(
      fakeAi(() => 'ok'),
      { costToday: 25, plan: 'premium' },
    );
    expect((await call((r) => analyzeMeal(r, premium.deps), post(mealBody))).status).toBe(200);
  });

  it('rate limits', async () => {
    const { deps } = makeDeps(
      fakeAi(() => 'ok'),
      { rateAllowed: false },
    );
    expect((await call((r) => analyzeMeal(r, deps), post(mealBody))).status).toBe(429);
  });

  it('reads nutrition labels in label mode', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    const res = await call((r) => analyzeMeal(r, deps), post({ ...mealBody, mode: 'label' }));
    expect((await body(res)).label).toMatchObject({ is_label: true, serving_size_g: 30 });
  });
});

describe('analyze-text', () => {
  it('limits free users to 5 text queries per day', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    for (let i = 0; i < 5; i++)
      expect(
        (await call((r) => analyzeText(r, deps), post({ text: 'dos empanadas' }))).status,
      ).toBe(200);
    expect((await call((r) => analyzeText(r, deps), post({ text: 'dos empanadas' }))).status).toBe(
      402,
    );
  });
});

describe('coach & meal plan', () => {
  it('gives free users exactly one trial message', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    const msg = { messages: [{ role: 'user', content: '¿Qué ceno?' }] };
    expect((await call((r) => coachChat(r, deps), post(msg))).status).toBe(200);
    const res = await call((r) => coachChat(r, deps), post(msg));
    expect(res.status).toBe(403);
    expect((await body(res)).error.code).toBe('PREMIUM_REQUIRED');
  });
  it('requires premium for the meal plan', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    expect((await call((r) => mealPlan(r, deps), post({}))).status).toBe(403);
    const premium = makeDeps(
      fakeAi(() => 'ok'),
      { plan: 'premium' },
    );
    expect((await call((r) => mealPlan(r, premium.deps), post({ days: 3 }))).status).toBe(200);
  });
});

describe('account', () => {
  it('reports quota status', async () => {
    const { deps } = makeDeps(
      fakeAi(() => 'ok'),
      { bonus: 2 },
    );
    const json = await body(await call((r) => quotaStatus(r, deps), post({})));
    expect(json).toMatchObject({
      plan: 'free',
      day: '2026-10-04',
      photo_scan: { remaining: 3 },
      bonus_photo_scans: 2,
      coach_trial_remaining: 1,
    });
  });
  it('deletes photos and the auth user, with audit trail', async () => {
    const { deps, state } = makeDeps(fakeAi(() => 'ok'));
    expect((await call((r) => deleteAccount(r, deps), post({}))).status).toBe(400);
    const res = await call((r) => deleteAccount(r, deps), post({ confirm: true }));
    expect(res.status).toBe(200);
    expect(state.removed).toContain(`${USER}/p1.jpg`);
    expect(state.deletedUsers).toEqual([USER]);
    expect(state.audit).toEqual(['account_deletion_requested', 'account_deleted']);
  });
  it('exports JSON for everyone and CSV for premium', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    expect((await call((r) => exportData(r, deps), post({ format: 'json' }))).status).toBe(200);
    expect((await call((r) => exportData(r, deps), post({ format: 'csv' }))).status).toBe(403);
    const premium = makeDeps(
      fakeAi(() => 'ok'),
      { plan: 'premium' },
    );
    const csv = (
      await body(await call((r) => exportData(r, premium.deps), post({ format: 'csv' })))
    ).csv as string;
    expect(csv.split('\n')[1]).toContain('"Milanesa, frita"');
  });
});

describe('revenuecat webhook', () => {
  const event = (over: Record<string, unknown> = {}) => ({
    event: {
      id: 'evt1',
      type: 'INITIAL_PURCHASE',
      app_user_id: USER,
      product_id: 'premium_annual',
      period_type: 'TRIAL',
      expiration_at_ms: Date.parse('2026-10-11T00:00:00Z'),
      store: 'PLAY_STORE',
      environment: 'SANDBOX',
      entitlement_ids: ['premium'],
      ...over,
    },
  });
  const auth = { Authorization: 'Bearer rc-secret' };

  it('rejects requests without the shared secret', async () => {
    const { deps } = makeDeps(fakeAi(() => 'ok'));
    expect((await call((r) => revenuecatWebhook(r, deps), post(event(), null))).status).toBe(401);
  });
  it('upserts a trialing subscription and is idempotent', async () => {
    const { deps, state } = makeDeps(fakeAi(() => 'ok'));
    await call((r) => revenuecatWebhook(r, deps), post(event(), null, auth));
    const dup = await body(
      await call((r) => revenuecatWebhook(r, deps), post(event(), null, auth)),
    );
    expect(dup.duplicate).toBe(true);
    expect(state.subscriptions).toHaveLength(1);
    expect(state.subscriptions[0]).toMatchObject({
      status: 'trialing',
      is_trial: true,
      platform: 'android',
      environment: 'SANDBOX',
      expires_at: '2026-10-11T00:00:00.000Z',
    });
  });
  it('credits consumable scan packs', async () => {
    const { deps, state } = makeDeps(fakeAi(() => 'ok'));
    await call(
      (r) => revenuecatWebhook(r, deps),
      post(
        event({
          id: 'e2',
          type: 'NON_RENEWING_PURCHASE',
          product_id: 'scan_pack_30',
          entitlement_ids: [],
        }),
        null,
        auth,
      ),
    );
    expect(state.bonus).toBe(30);
  });
  it('ignores unknown users', async () => {
    const { deps, state } = makeDeps(fakeAi(() => 'ok'));
    const res = await body(
      await call(
        (r) => revenuecatWebhook(r, deps),
        post(event({ id: 'e3', app_user_id: '$RCAnonymousID:abc' }), null, auth),
      ),
    );
    expect(res.ignored).toBe(true);
    expect(state.subscriptions).toHaveLength(0);
  });
  it('maps lifecycle events', () => {
    expect(stateFor({ id: '1', type: 'CANCELLATION' })).toEqual({
      status: 'cancelled',
      will_renew: false,
    });
    expect(stateFor({ id: '1', type: 'EXPIRATION' })?.status).toBe('expired');
    expect(stateFor({ id: '1', type: 'RENEWAL' })?.status).toBe('active');
    expect(stateFor({ id: '1', type: 'BILLING_ISSUE' })?.status).toBe('billing_issue');
    expect(stateFor({ id: '1', type: 'TRANSFER' })).toBeNull();
  });
});

describe('enrichment pipeline', () => {
  const lookup = (usda: () => Promise<never[]> = async () => []) => ({
    searchRegional: async (q: string) =>
      REGIONAL.filter((r) => r.name_es.toLowerCase().includes(q.toLowerCase().split(' ')[0]!)),
    searchUsda: usda,
  });

  it('prefers the regional match closest to the AI estimate', async () => {
    const r = await enrichItem(MOCK_PLATES[0]!.items[0]!, lookup());
    expect(r).toMatchObject({ food_source: 'regional', food_id: 'milanesa_carne_frita' });
  });
  it('falls back to the AI estimate when nothing plausible matches', async () => {
    const item = {
      ...MOCK_PLATES[0]!.items[0]!,
      name: 'Ceviche',
      name_en: 'ceviche',
      search_hints: ['ceviche'],
    };
    const r = await enrichItem(item, lookup());
    expect(r).toMatchObject({ food_source: 'ai', food_id: null, per100g: item.per_100g_estimate });
  });
  it('rejects an implausible database value', async () => {
    const item = {
      ...MOCK_PLATES[0]!.items[1]!,
      per_100g_estimate: { kcal: 400, protein_g: 5, carbs_g: 40, fat_g: 25 },
    };
    const r = await enrichItem(item, lookup());
    expect(r.food_source).toBe('ai');
  });
  it('survives lookup failures', async () => {
    const r = await enrichItem(MOCK_PLATES[0]!.items[0]!, {
      searchRegional: async () => {
        throw new Error('db down');
      },
      searchUsda: async () => {
        throw new Error('usda down');
      },
    });
    expect(r.food_source).toBe('ai');
  });
});

describe('cost', () => {
  it('prices Haiku and Sonnet per MTok', () => {
    expect(estimateCostUsd('claude-haiku-4-5', 1_000_000, 0)).toBe(1);
    expect(estimateCostUsd('claude-sonnet-5-5', 1000, 500)).toBeCloseTo(0.007, 6);
  });
});
