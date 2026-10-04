import { ENTITLEMENT_PREMIUM, PRODUCT_IDS, SCAN_PACK_SIZE } from '../shared/index.ts';
import type { ServerDeps, SubscriptionUpsert } from '../deps.ts';
import { HttpError, json } from '../http.ts';

/** Subset of the RevenueCat webhook payload we rely on (v1 events). */
export interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_to?: string[];
  product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: 'TRIAL' | 'INTRO' | 'NORMAL' | 'PREPAID';
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number;
  store?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
  original_transaction_id?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function platformOf(store?: string): SubscriptionUpsert['platform'] {
  switch (store) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
      return 'ios';
    case 'PLAY_STORE':
      return 'android';
    case 'STRIPE':
      return 'stripe';
    case 'PROMOTIONAL':
      return 'promotional';
    default:
      return null;
  }
}

/** Constant-time comparison for the shared secret. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Maps an event type to the subscription state it implies (null = no state change). */
export function stateFor(
  e: RevenueCatEvent,
): Pick<SubscriptionUpsert, 'status' | 'will_renew'> | null {
  const trial = e.period_type === 'TRIAL';
  switch (e.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'TEMPORARY_ENTITLEMENT_GRANT':
      return { status: trial ? 'trialing' : 'active', will_renew: true };
    case 'CANCELLATION':
      // Access continues until expiration; it just won't renew.
      return { status: 'cancelled', will_renew: false };
    case 'BILLING_ISSUE':
      return { status: 'billing_issue', will_renew: true };
    case 'SUBSCRIPTION_PAUSED':
    case 'EXPIRATION':
      return { status: 'expired', will_renew: false };
    default:
      return null;
  }
}

/**
 * POST /revenuecat-webhook — server source of truth for the premium entitlement.
 * Auth: RevenueCat sends the configured Authorization header value (Bearer <secret>).
 * Idempotent by event id. App user id = Supabase user id (set via Purchases.logIn).
 */
export async function revenuecatWebhook(req: Request, deps: ServerDeps): Promise<Response> {
  const secret = deps.config.revenuecatWebhookSecret;
  const header = req.headers.get('Authorization') ?? '';
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) throw new HttpError(401, 'UNAUTHORIZED');

  let body: { event?: RevenueCatEvent };
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, 'INVALID_INPUT');
  }
  const e = body.event;
  if (!e?.id || !e.type) throw new HttpError(400, 'INVALID_INPUT');

  const candidates = [
    e.app_user_id,
    e.original_app_user_id,
    ...(e.aliases ?? []),
    ...(e.transferred_to ?? []),
  ].filter((x): x is string => !!x && UUID.test(x));
  let userId: string | null = null;
  for (const c of candidates) {
    if (await deps.db.userExists(c)) {
      userId = c;
      break;
    }
  }

  const isNew = await deps.db.recordWebhookEvent(e.id, userId, e.type, body);
  if (!isNew) return json({ ok: true, duplicate: true });
  if (e.type === 'TEST' || !userId) return json({ ok: true, ignored: !userId });

  // Consumable scan packs.
  if (e.type === 'NON_RENEWING_PURCHASE' && e.product_id?.startsWith(PRODUCT_IDS.scanPack30)) {
    await deps.db.addBonusScans(userId, SCAN_PACK_SIZE);
    return json({ ok: true });
  }

  const entitlements = e.entitlement_ids ?? [];
  if (entitlements.length && !entitlements.includes(ENTITLEMENT_PREMIUM))
    return json({ ok: true, ignored: true });

  const state = stateFor(e);
  if (!state) return json({ ok: true, ignored: true });
  await deps.db.upsertSubscription({
    user_id: userId,
    product_id: e.product_id ?? null,
    platform: platformOf(e.store),
    ...state,
    expires_at: e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : null,
    is_trial: e.period_type === 'TRIAL',
    original_transaction_id: e.original_transaction_id ?? null,
    environment: e.environment ?? null,
    last_event_type: e.type,
    last_event_at: new Date(e.event_timestamp_ms ?? deps.now().getTime()).toISOString(),
  });
  return json({ ok: true });
}
