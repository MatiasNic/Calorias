import type { AppLocale, Plan, QuotaKind } from './shared/index.ts';
import type { AIProvider } from './ai/types.ts';
import type { ServerConfig } from './config.ts';
import type { RegionalRow } from './enrich.ts';

export interface ProfileInfo {
  timezone: string;
  locale: AppLocale;
  country: string;
  dietaryPreferences: string[];
  allergies: string[];
  savePhotos: boolean;
}

export interface ScanRow {
  user_id: string;
  kind: 'photo' | 'text' | 'label' | 'menu' | 'fridge' | 'coach' | 'meal_plan' | 'recipe';
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number | null;
  status: 'ok' | 'error' | 'not_food' | 'cached' | 'invalid_response' | 'timeout';
  error: string | null;
  image_sha256: string | null;
  result: unknown;
}

export interface SubscriptionUpsert {
  user_id: string;
  product_id: string | null;
  platform: 'android' | 'ios' | 'stripe' | 'promotional' | 'mock' | null;
  status: 'active' | 'trialing' | 'grace_period' | 'billing_issue' | 'cancelled' | 'expired';
  expires_at: string | null;
  is_trial: boolean;
  will_renew: boolean;
  original_transaction_id: string | null;
  environment: 'SANDBOX' | 'PRODUCTION' | null;
  last_event_type: string;
  last_event_at: string;
}

/** Everything a handler needs from the outside world. Real: supabaseDeps.ts. Tests: fakes. */
export interface ServerDeps {
  config: ServerConfig;
  ai: AIProvider;
  now(): Date;
  fetch: typeof fetch;
  userFromToken(token: string): Promise<{ id: string; email: string | null } | null>;
  deleteAuthUser(userId: string): Promise<void>;
  db: {
    profile(userId: string): Promise<ProfileInfo>;
    plan(userId: string): Promise<Plan>;
    consumeQuota(
      userId: string,
      kind: QuotaKind,
      day: string,
      dailyLimit: number,
      trialLimit: number,
    ): Promise<{ allowed: boolean; used: number; bucket: string | null }>;
    refundQuota(userId: string, kind: QuotaKind, day: string, bucket: string | null): Promise<void>;
    quotaUsage(
      userId: string,
      day: string,
    ): Promise<{ photo_scans: number; text_queries: number; coach_messages: number }>;
    credits(
      userId: string,
    ): Promise<{ bonus_photo_scans: number; lifetime_coach_messages: number }>;
    addBonusScans(userId: string, amount: number): Promise<void>;
    findScanByHash(
      userId: string,
      sha: string,
      kind: ScanRow['kind'],
      sinceIso: string,
    ): Promise<{ id: string; result: unknown } | null>;
    insertScan(row: ScanRow): Promise<string>;
    aiCostToday(): Promise<number>;
    rateLimit(bucket: string, max: number, windowSeconds: number): Promise<boolean>;
    searchRegional(query: string): Promise<RegionalRow[]>;
    cacheGet(
      source: 'usda' | 'off',
      key: string,
    ): Promise<{ payload: unknown; fetchedAt: string } | null>;
    cacheSet(source: 'usda' | 'off', key: string, payload: unknown): Promise<void>;
    audit(userId: string | null, event: string, metadata?: Record<string, unknown>): Promise<void>;
    coachContext(userId: string, today: string): Promise<string>;
    exportUserData(userId: string): Promise<Record<string, unknown>>;
    userExists(userId: string): Promise<boolean>;
    recordWebhookEvent(
      id: string,
      appUserId: string | null,
      type: string,
      payload: unknown,
    ): Promise<boolean>;
    upsertSubscription(s: SubscriptionUpsert): Promise<void>;
  };
  storage: {
    download(
      bucket: string,
      path: string,
    ): Promise<{ bytes: Uint8Array; mediaType: string } | null>;
    remove(bucket: string, paths: string[]): Promise<void>;
    list(bucket: string, prefix: string): Promise<string[]>;
  };
}
