import { MOCK_PLATES, type AiAnalysis, type Plan } from '../shared/index.ts';
import { AIError, type AIProvider, type AIUsage } from '../ai/types.ts';
import type { ServerConfig } from '../config.ts';
import type { ScanRow, ServerDeps, SubscriptionUpsert } from '../deps.ts';
import type { RegionalRow } from '../enrich.ts';

export const USER = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';
export const SHA = 'a'.repeat(64);

const usage = (model: string): AIUsage => ({
  model,
  inputTokens: 1200,
  outputTokens: 300,
  cacheReadTokens: 0,
  latencyMs: 2100,
});

export type AiBehavior = 'ok' | 'not_food' | 'timeout' | 'invalid' | 'refusal';

export function fakeAi(
  behavior: () => AiBehavior,
  analysis: AiAnalysis = MOCK_PLATES[0]!,
): AIProvider & { calls: string[] } {
  const calls: string[] = [];
  const run = async <T>(model: string, data: T) => {
    calls.push(model);
    const b = behavior();
    if (b === 'timeout') throw new AIError('timeout');
    if (b === 'invalid') throw new AIError('invalid', 'schema', usage(model));
    if (b === 'refusal') throw new AIError('refusal', undefined, usage(model));
    return { data, usage: usage(model) };
  };
  const notFood: AiAnalysis = {
    is_food: false,
    dish_name: null,
    items: [],
    hidden_ingredients_question: null,
    notes: 'Es un perro',
  };
  return {
    calls,
    analyzeMealImage: (_i, model) => run(model, behavior() === 'not_food' ? notFood : analysis),
    analyzeMealText: (_i, model) => run(model, behavior() === 'not_food' ? notFood : analysis),
    readLabel: (_i, model) =>
      run(model, {
        is_label: true,
        product_name: 'X',
        brand: null,
        serving_size_g: 30,
        per_100g: { kcal: 400, protein_g: 10, carbs_g: 70, fat_g: 10 },
        per_serving: null,
        notes: null,
      }),
    coach: (_i, model) => run(model, 'Comé más verduras.'),
    mealPlan: (_i, model) => run(model, { days: [], shopping_list: [], notes: null }),
  };
}

export const REGIONAL: RegionalRow[] = [
  {
    id: 'milanesa_carne_frita',
    name_es: 'Milanesa de carne frita',
    name_en: 'Breaded fried beef cutlet',
    name_pt: 'Bife à milanesa frito',
    aliases: ['milanesa'],
    kcal: 270,
    protein_g: 18,
    carbs_g: 14,
    fat_g: 16,
    fiber_g: 0.8,
    sugar_g: 1,
    sodium_mg: 380,
    sat_fat_g: 3.5,
  },
  {
    id: 'milanesa_soja',
    name_es: 'Milanesa de soja',
    name_en: 'Soy cutlet',
    name_pt: 'Milanesa de soja',
    aliases: [],
    kcal: 230,
    protein_g: 14,
    carbs_g: 22,
    fat_g: 10,
    fiber_g: 4,
    sugar_g: 2,
    sodium_mg: 420,
    sat_fat_g: 1.5,
  },
  {
    id: 'pure_papa',
    name_es: 'Puré de papa',
    name_en: 'Mashed potatoes',
    name_pt: 'Purê de batata',
    aliases: ['pure'],
    kcal: 105,
    protein_g: 2,
    carbs_g: 15,
    fat_g: 4,
    fiber_g: 1.4,
    sugar_g: 1.2,
    sodium_mg: 300,
    sat_fat_g: 2.5,
  },
];

export const config: ServerConfig = {
  anthropicApiKey: 'test',
  aiModelFree: 'claude-haiku-4-5',
  aiModelPremium: 'claude-sonnet-5-5',
  aiDailyBudgetUsd: 20,
  aiMock: false,
  aiAlertWebhookUrl: null,
  usdaApiKey: null,
  revenuecatWebhookSecret: 'rc-secret',
  supabaseUrl: 'http://localhost',
  serviceRoleKey: 'x',
};

export interface FakeState {
  plan: Plan;
  usage: Map<string, { photo_scans: number; text_queries: number; coach_messages: number }>;
  bonus: number;
  lifetimeCoach: number;
  scans: (ScanRow & { id: string })[];
  costToday: number;
  photos: Map<string, Uint8Array>;
  removed: string[];
  events: Set<string>;
  subscriptions: SubscriptionUpsert[];
  audit: string[];
  deletedUsers: string[];
  rateAllowed: boolean;
}

export function makeDeps(
  ai: AIProvider,
  overrides: Partial<FakeState> = {},
  cfg: Partial<ServerConfig> = {},
) {
  const state: FakeState = {
    plan: 'free',
    usage: new Map(),
    bonus: 0,
    lifetimeCoach: 0,
    scans: [],
    costToday: 0,
    photos: new Map([[`${USER}/p1.jpg`, new Uint8Array([1, 2, 3])]]),
    removed: [],
    events: new Set(),
    subscriptions: [],
    audit: [],
    deletedUsers: [],
    rateAllowed: true,
    ...overrides,
  };
  const col = {
    photo_scan: 'photo_scans',
    text_query: 'text_queries',
    coach_message: 'coach_messages',
  } as const;
  const deps: ServerDeps = {
    config: { ...config, ...cfg },
    ai,
    now: () => new Date('2026-10-04T15:00:00Z'),
    fetch: (async () => new Response('{}')) as typeof fetch,
    userFromToken: async (t) => (t === 'good' ? { id: USER, email: 'a@b.c' } : null),
    deleteAuthUser: async (id) => void state.deletedUsers.push(id),
    db: {
      profile: async () => ({
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR',
        country: 'AR',
        dietaryPreferences: [],
        allergies: [],
        savePhotos: true,
      }),
      plan: async () => state.plan,
      consumeQuota: async (_u, kind, day, limit, trial) => {
        const u = state.usage.get(day) ?? { photo_scans: 0, text_queries: 0, coach_messages: 0 };
        state.usage.set(day, u);
        const k = col[kind];
        if (u[k] < limit) return { allowed: true, used: ++u[k], bucket: 'daily' };
        if (kind === 'coach_message' && state.lifetimeCoach < trial) {
          state.lifetimeCoach++;
          return { allowed: true, used: ++u[k], bucket: 'trial' };
        }
        if (kind === 'photo_scan' && state.bonus > 0) {
          state.bonus--;
          return { allowed: true, used: ++u[k], bucket: 'bonus' };
        }
        return { allowed: false, used: u[k], bucket: null };
      },
      refundQuota: async (_u, kind, day, bucket) => {
        const u = state.usage.get(day);
        if (u) u[col[kind]] = Math.max(0, u[col[kind]] - 1);
        if (bucket === 'bonus') state.bonus++;
      },
      quotaUsage: async (_u, day) =>
        state.usage.get(day) ?? { photo_scans: 0, text_queries: 0, coach_messages: 0 },
      credits: async () => ({
        bonus_photo_scans: state.bonus,
        lifetime_coach_messages: state.lifetimeCoach,
      }),
      addBonusScans: async (_u, n) => void (state.bonus += n),
      findScanByHash: async (_u, sha, kind) => {
        const s = state.scans.find(
          (x) =>
            x.image_sha256 === sha &&
            x.kind === kind &&
            (x.status === 'ok' || x.status === 'not_food'),
        );
        return s ? { id: s.id, result: s.result } : null;
      },
      insertScan: async (row) => {
        const id = `00000000-0000-4000-8000-${String(state.scans.length + 1).padStart(12, '0')}`;
        state.scans.push({ ...row, id });
        state.costToday += row.cost_usd;
        return id;
      },
      aiCostToday: async () => state.costToday,
      rateLimit: async () => state.rateAllowed,
      searchRegional: async (q) =>
        REGIONAL.filter((r) => r.name_es.toLowerCase().includes(q.toLowerCase().split(' ')[0]!)),
      cacheGet: async () => null,
      cacheSet: async () => undefined,
      audit: async (_u, e) => void state.audit.push(e),
      coachContext: async () => 'Today: 1200 kcal',
      exportUserData: async () => ({
        meals: [
          {
            local_date: '2026-10-04',
            eaten_at: 'x',
            meal_type: 'lunch',
            source: 'photo',
            meal_items: [{ display_name: 'Milanesa, frita', grams: 150, kcal: 405 }],
          },
        ],
      }),
      userExists: async (id) => id === USER,
      recordWebhookEvent: async (id) => {
        if (state.events.has(id)) return false;
        state.events.add(id);
        return true;
      },
      upsertSubscription: async (s) => void state.subscriptions.push(s),
    },
    storage: {
      download: async (_b, path) =>
        state.photos.has(path) ? { bytes: state.photos.get(path)!, mediaType: 'image/jpeg' } : null,
      remove: async (_b, paths) => void state.removed.push(...paths),
      list: async (_b, prefix) => [...state.photos.keys()].filter((k) => k.startsWith(prefix)),
    },
  };
  return { deps, state };
}

export function post(
  body: unknown,
  token: string | null = 'good',
  headers: Record<string, string> = {},
) {
  return new Request('http://localhost/fn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
