import type { Plan, QuotaKind } from './schemas/enums.ts';

/**
 * Freemium plan definition. Mirrored on the server (Edge Functions import this same file via
 * supabase/functions/_shared/shared). Change limits here only.
 */
export interface PlanLimits {
  /** Daily limits per AI feature. `null` = unlimited (never used: premium has a fair-use cap). */
  daily: Record<QuotaKind, number>;
  /** Lifetime trial allowance for features otherwise unavailable (e.g. coach on free). */
  lifetimeTrial: Partial<Record<QuotaKind, number>>;
  historyDays: number | null;
  progressChartDays: number | null;
  aiModelTier: 'economy' | 'precision';
  features: {
    mealPlan: boolean;
    adaptiveGoal: boolean;
    micronutrients: boolean;
    menuScan: boolean;
    export: boolean;
    healthSync: boolean;
    highQualityPhotos: boolean;
    progressPhotos: boolean;
    ads: boolean;
  };
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: {
    daily: { photo_scan: 3, text_query: 5, coach_message: 0 },
    lifetimeTrial: { coach_message: 1 },
    historyDays: 30,
    progressChartDays: 7,
    aiModelTier: 'economy',
    features: {
      mealPlan: false,
      adaptiveGoal: false,
      micronutrients: false,
      menuScan: false,
      export: false,
      healthSync: false,
      highQualityPhotos: false,
      progressPhotos: false,
      ads: false,
    },
  },
  premium: {
    // "Unlimited with fair use": technical caps to protect against abuse.
    daily: { photo_scan: 50, text_query: 100, coach_message: 50 },
    lifetimeTrial: {},
    historyDays: null,
    progressChartDays: null,
    aiModelTier: 'precision',
    features: {
      mealPlan: true,
      adaptiveGoal: true,
      micronutrients: true,
      menuScan: true,
      export: true,
      healthSync: true,
      highQualityPhotos: true,
      progressPhotos: true,
      ads: false,
    },
  },
};

export type PremiumFeature = keyof PlanLimits['features'];

export const PRODUCT_IDS = {
  monthly: 'premium_monthly',
  annual: 'premium_annual',
  weekly: 'premium_weekly',
  scanPack30: 'scan_pack_30',
} as const;

export const ENTITLEMENT_PREMIUM = 'premium';
export const SCAN_PACK_SIZE = 30;

export function hasFeature(plan: Plan, feature: PremiumFeature): boolean {
  return PLANS[plan].features[feature];
}
