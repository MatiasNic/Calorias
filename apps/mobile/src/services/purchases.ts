import { ENTITLEMENT_PREMIUM, PRODUCT_IDS, type Plan } from '@plato/shared';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { env } from '@/config/env';
import { features } from '@/config/features';
import { getSupabase } from '@/services/supabase/client';
import { kvJSONStorage } from '@/stores/kv';
import { useSessionStore } from '@/stores/session';

/**
 * Payments via RevenueCat (Google Play Billing + StoreKit). The **server** (subscriptions table,
 * updated by the RevenueCat webhook) is the source of truth for the plan; the app reflects it and
 * uses the RevenueCat entitlement only optimistically right after a purchase, until the webhook
 * lands. In mock mode purchases are simulated locally.
 */

export interface PlanPackage {
  id: string;
  productId: string;
  kind: 'annual' | 'monthly' | 'weekly' | 'other';
  priceString: string;
  /** Price per month for comparison (null for weekly/unknown). */
  monthlyEquivalent: string | null;
  price: number;
  currency: string;
  trialDays: number | null;
  rcPackage?: PurchasesPackage;
}

interface PlanState {
  plan: Plan;
  /** Where the current plan value came from. */
  source: 'server' | 'store' | 'mock' | 'default';
  expiresAt: string | null;
  isTrial: boolean;
  setPlan: (p: Partial<Omit<PlanState, 'setPlan'>>) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: 'free',
      source: 'default',
      expiresAt: null,
      isTrial: false,
      setPlan: (p) => set(p),
    }),
    { name: 'plato.plan', storage: kvJSONStorage },
  ),
);

export const isPremium = () => usePlanStore.getState().plan === 'premium';
export const usePlan = () => usePlanStore((s) => s.plan);

let configured = false;
const mockPurchasesEnabled = () =>
  env.useMocks || !(Platform.OS === 'android' ? env.revenueCatAndroidKey : env.revenueCatIosKey);

function applyCustomerInfo(info: CustomerInfo) {
  const ent = info.entitlements.active[ENTITLEMENT_PREMIUM];
  if (ent) {
    usePlanStore.getState().setPlan({
      plan: 'premium',
      source: 'store',
      expiresAt: ent.expirationDate,
      isTrial: ent.periodType === 'TRIAL',
    });
  }
}

export async function initPurchases(appUserId: string) {
  if (mockPurchasesEnabled()) {
    if (usePlanStore.getState().source === 'default')
      usePlanStore.getState().setPlan({ source: 'mock' });
    // Real backend without store keys (test builds): the server plan still applies, e.g. a
    // promotional subscription granted from the dashboard.
    if (!env.useMocks) await refreshPlan();
    return;
  }
  const apiKey = Platform.OS === 'android' ? env.revenueCatAndroidKey : env.revenueCatIosKey;
  if (!configured) {
    if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.WARN);
    // App user id = Supabase user id, so webhook events map straight to our users.
    Purchases.configure({
      apiKey,
      appUserID: useSessionStore.getState().status === 'authenticated' ? appUserId : null,
    });
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    configured = true;
  } else if (useSessionStore.getState().status === 'authenticated') {
    await Purchases.logIn(appUserId);
  }
  await refreshPlan();
}

/** Reads the plan from the server (truth). Falls back to the store entitlement. */
export async function refreshPlan(): Promise<Plan> {
  const sb = getSupabase();
  if (sb && useSessionStore.getState().status === 'authenticated') {
    const { data, error } = await sb.rpc('my_plan');
    if (!error && (data === 'free' || data === 'premium')) {
      const prev = usePlanStore.getState();
      // Keep an optimistic store entitlement for a short while after purchase (webhook latency).
      if (!(data === 'free' && prev.source === 'store' && prev.plan === 'premium')) {
        usePlanStore.getState().setPlan({ plan: data, source: 'server' });
      }
      return data;
    }
  }
  if (!mockPurchasesEnabled() && configured) {
    applyCustomerInfo(await Purchases.getCustomerInfo());
  }
  return usePlanStore.getState().plan;
}

function kindOf(productId: string): PlanPackage['kind'] {
  if (productId.startsWith(PRODUCT_IDS.annual)) return 'annual';
  if (productId.startsWith(PRODUCT_IDS.monthly)) return 'monthly';
  if (productId.startsWith(PRODUCT_IDS.weekly)) return 'weekly';
  return 'other';
}

function trialDaysFromPeriod(period: string | null | undefined): number | null {
  if (!period) return null;
  const m = /^P(\d+)([DWM])$/.exec(period);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === 'D' ? n : m[2] === 'W' ? n * 7 : n * 30;
}

const MOCK_PACKAGES: PlanPackage[] = [
  {
    id: '$rc_annual',
    productId: PRODUCT_IDS.annual,
    kind: 'annual',
    priceString: 'US$ 39,99',
    monthlyEquivalent: 'US$ 3,33',
    price: 39.99,
    currency: 'USD',
    trialDays: 7,
  },
  {
    id: '$rc_monthly',
    productId: PRODUCT_IDS.monthly,
    kind: 'monthly',
    priceString: 'US$ 7,99',
    monthlyEquivalent: 'US$ 7,99',
    price: 7.99,
    currency: 'USD',
    trialDays: null,
  },
  {
    id: '$rc_weekly',
    productId: PRODUCT_IDS.weekly,
    kind: 'weekly',
    priceString: 'US$ 3,99',
    monthlyEquivalent: null,
    price: 3.99,
    currency: 'USD',
    trialDays: null,
  },
];

/** Packages of the current offering (prices always from the store, never hardcoded in prod). */
export async function getPackages(): Promise<PlanPackage[]> {
  const filter = (p: PlanPackage[]) =>
    p.filter((x) => x.kind !== 'weekly' || features.weeklyPaywallProduct);
  if (mockPurchasesEnabled()) return filter(MOCK_PACKAGES);
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return filter(
    current.availablePackages.map((p) => {
      const kind = kindOf(p.product.identifier);
      const fmt = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: p.product.currencyCode,
      });
      return {
        id: p.identifier,
        productId: p.product.identifier,
        kind,
        priceString: p.product.priceString,
        monthlyEquivalent:
          kind === 'annual'
            ? fmt.format(p.product.price / 12)
            : kind === 'monthly'
              ? p.product.priceString
              : null,
        price: p.product.price,
        currency: p.product.currencyCode,
        trialDays:
          p.product.introPrice?.price === 0
            ? trialDaysFromPeriod(p.product.introPrice.period)
            : null,
        rcPackage: p,
      };
    }),
  );
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'error' | 'unavailable';

export async function purchase(pkg: PlanPackage): Promise<PurchaseOutcome> {
  // Real backend without store keys (test builds): a simulated purchase would only unlock the
  // UI while the server keeps enforcing the free plan. The plan comes from the server instead.
  if (mockPurchasesEnabled() && !env.useMocks) return 'unavailable';
  if (mockPurchasesEnabled()) {
    usePlanStore.getState().setPlan({
      plan: 'premium',
      source: 'mock',
      isTrial: !!pkg.trialDays,
      expiresAt: new Date(
        Date.now() + (pkg.kind === 'annual' ? 365 : 30) * 86_400_000,
      ).toISOString(),
    });
    return 'purchased';
  }
  if (!pkg.rcPackage) return 'error';
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);
    applyCustomerInfo(customerInfo);
    // Webhook updates the server; re-read shortly after.
    setTimeout(() => void refreshPlan(), 4000);
    return customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] ? 'purchased' : 'error';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
    return 'error';
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (mockPurchasesEnabled() && !env.useMocks) return (await refreshPlan()) === 'premium';
  if (mockPurchasesEnabled()) return usePlanStore.getState().plan === 'premium';
  const info = await Purchases.restorePurchases();
  applyCustomerInfo(info);
  setTimeout(() => void refreshPlan(), 4000);
  return !!info.entitlements.active[ENTITLEMENT_PREMIUM];
}

/** RevenueCat Customer Center (manage / cancel / refund). Returns false in mock mode. */
export async function openCustomerCenter(): Promise<boolean> {
  if (mockPurchasesEnabled()) return false;
  await RevenueCatUI.presentCustomerCenter();
  await refreshPlan();
  return true;
}

/** Mock-only: lets testers go back to the free plan. */
export function mockCancelSubscription() {
  usePlanStore
    .getState()
    .setPlan({ plan: 'free', source: 'mock', isTrial: false, expiresAt: null });
}

export const purchasesAreMocked = mockPurchasesEnabled;
