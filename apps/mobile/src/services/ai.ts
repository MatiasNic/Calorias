import {
  AnalyzeResponseSchema,
  CoachResponseSchema,
  LabelResponseSchema,
  matchScore,
  MealPlanSchema,
  mockAnalyzeImage,
  mockAnalyzeText,
  mockCoachReply,
  mockMealPlan,
  mockReadLabel,
  PLANS,
  QuotaStatusSchema,
  type AnalyzeResponse,
  type AiAnalysis,
  type CoachResponse,
  type EnrichedItem,
  type LabelResponse,
  type MealPlan,
  type MealPlanPreferences,
  type MealType,
  type QuotaKind,
  type QuotaStatus,
} from '@plato/shared';
import { z } from 'zod';

import { env } from '@/config/env';
import { searchRegional } from '@/features/foods/search';
import { currentLocale } from '@/i18n';
import { invokeFunction } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { newId } from '@/services/db/repository';
import { MEAL_PHOTOS_BUCKET } from '@/services/photos';
import { usePlanStore } from '@/services/purchases';
import { requireSupabase } from '@/services/supabase/client';
import { kv } from '@/stores/kv';
import { usePrefsStore } from '@/stores/prefs';
import { currentUserId, useSessionStore } from '@/stores/session';
import { todayLocal } from '@/utils/dates';
import type { PreparedImage } from './image';

/**
 * App-side AI client. Production: uploads the compressed photo to the private bucket and calls the
 * Edge Functions (the API key never leaves the server). Demo mode: deterministic fixtures with the
 * same contracts, a simulated delay and locally enforced daily quotas so the paywall can be tested.
 */

const mocked = () => env.useMocks;
const MOCK_DELAY_MS = 1600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** AI needs a server identity: guests on a real backend must create an account first. */
export function aiAvailable(): 'ok' | 'needs_account' {
  if (mocked()) return 'ok';
  return useSessionStore.getState().status === 'authenticated' ? 'ok' : 'needs_account';
}

// ── demo-mode quota emulation ──
const MOCK_QUOTA_KEY = 'plato.mockQuota';
type MockUsage = Record<string, Record<QuotaKind, number>>;

function mockUsage(): MockUsage {
  try {
    return JSON.parse(kv.get(MOCK_QUOTA_KEY) ?? '{}') as MockUsage;
  } catch {
    return {};
  }
}

/** Lifetime trials (e.g. the free coach message) are counted once, not per day. */
const MOCK_TRIAL_KEY = 'plato.mockTrials';
function mockTrialsUsed(kind: QuotaKind): number {
  try {
    return (
      (JSON.parse(kv.get(MOCK_TRIAL_KEY) ?? '{}') as Partial<Record<QuotaKind, number>>)[kind] ?? 0
    );
  } catch {
    return 0;
  }
}

function consumeMock(kind: QuotaKind) {
  const plan = usePlanStore.getState().plan;
  const day = todayLocal();
  const all = mockUsage();
  const used = all[day]?.[kind] ?? 0;
  const limit = PLANS[plan].daily[kind];
  const trial = PLANS[plan].lifetimeTrial[kind] ?? 0;
  if (limit === 0 && trial > 0) {
    // Same as the server: a free feature with a one-time trial, then Premium is required.
    const usedTrial = mockTrialsUsed(kind);
    if (usedTrial >= trial) throw new ApiError('PREMIUM_REQUIRED', 403, { kind });
    kv.set(MOCK_TRIAL_KEY, JSON.stringify({ [kind]: usedTrial + 1 }));
    return { used: usedTrial + 1, limit: trial, remaining: Math.max(0, trial - usedTrial - 1) };
  }
  if (used >= limit)
    throw new ApiError(
      limit === 0 ? 'PREMIUM_REQUIRED' : 'QUOTA_EXCEEDED',
      limit === 0 ? 403 : 402,
      { limit, used, kind },
    );
  all[day] = { photo_scan: 0, text_query: 0, coach_message: 0, ...all[day], [kind]: used + 1 };
  kv.set(MOCK_QUOTA_KEY, JSON.stringify({ [day]: all[day] }));
  return { used: used + 1, limit, remaining: Math.max(0, limit - used - 1) };
}

/** Local stand-in for the server enrichment pipeline (regional table, plausibility check). */
function enrichLocally(analysis: AiAnalysis): EnrichedItem[] {
  return analysis.items.map((it) => {
    const aiKcal = it.per_100g_estimate.kcal;
    const queries = [it.name, ...it.search_hints];
    const plausible = (kcal: number) =>
      aiKcal <= 5 ? kcal <= 20 : kcal / aiKcal >= 0.55 && kcal / aiKcal <= 1.8;
    // Same ranking as the server: best name match first, then closest kcal to the AI estimate.
    const match = queries
      .flatMap((q) => searchRegional(q, 5))
      .map((f) => ({ f, score: Math.max(...queries.map((q) => matchScore(q, [f.name]))) }))
      .filter((x) => x.score >= 60 && plausible(x.f.per100g.kcal))
      .sort(
        (a, b) =>
          b.score - a.score ||
          Math.abs(a.f.per100g.kcal - aiKcal) - Math.abs(b.f.per100g.kcal - aiKcal),
      )[0]?.f;
    return {
      display_name: it.name,
      name_en: it.name_en,
      grams: Math.round(it.estimated_grams),
      household_measure: it.household_measure,
      cooking_method: it.cooking_method,
      confidence: it.confidence,
      food_source: match ? 'regional' : 'ai',
      food_id: match?.id ?? null,
      per100g: match
        ? { ...match.per100g, fiber_g: match.per100g.fiber_g ?? 0 }
        : it.per_100g_estimate,
      bbox: it.bbox,
    };
  });
}

function mockResponse(analysis: AiAnalysis, quota: AnalyzeResponse['quota']): AnalyzeResponse {
  return {
    scan_id: null,
    cached: false,
    is_food: analysis.is_food,
    dish_name: analysis.dish_name,
    items: enrichLocally(analysis),
    hidden_ingredients_question: analysis.hidden_ingredients_question,
    notes: analysis.notes,
    model: 'demo',
    quota,
  };
}

async function uploadPhoto(img: PreparedImage): Promise<string> {
  const path = `${currentUserId()}/${newId()}.jpg`;
  const { error } = await requireSupabase()
    .storage.from(MEAL_PHOTOS_BUCKET)
    .upload(path, img.bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new ApiError('NETWORK', 0, { reason: error.message });
  return path;
}

export interface PhotoAnalysis {
  result: AnalyzeResponse;
  photoPath: string | null;
}

export async function analyzeMealPhoto(
  img: PreparedImage,
  mealType?: MealType,
): Promise<PhotoAnalysis> {
  if (mocked()) {
    const quota = consumeMock('photo_scan');
    await sleep(MOCK_DELAY_MS);
    return { result: mockResponse(mockAnalyzeImage(img.sha256), quota), photoPath: null };
  }
  const photoPath = await uploadPhoto(img);
  const keep = usePrefsStore.getState().savePhotos;
  const result = await invokeFunction(
    'analyze-meal',
    {
      photo_path: photoPath,
      image_sha256: img.sha256,
      locale: currentLocale(),
      meal_type: mealType,
      mode: 'meal',
      keep_photo: keep,
    },
    AnalyzeResponseSchema,
  );
  return { result, photoPath: keep ? photoPath : null };
}

export async function analyzeMealText(
  text: string,
  source: 'text' | 'voice' | 'recipe' = 'text',
): Promise<AnalyzeResponse> {
  if (mocked()) {
    const quota = consumeMock('text_query');
    await sleep(MOCK_DELAY_MS / 2);
    return mockResponse(mockAnalyzeText(text), quota);
  }
  return invokeFunction(
    'analyze-text',
    { text, locale: currentLocale(), source },
    AnalyzeResponseSchema,
  );
}

export async function readNutritionLabel(img: PreparedImage): Promise<LabelResponse> {
  if (mocked()) {
    const quota = consumeMock('photo_scan');
    await sleep(MOCK_DELAY_MS);
    return { scan_id: null, label: mockReadLabel(), quota };
  }
  const photoPath = await uploadPhoto(img);
  return invokeFunction(
    'analyze-meal',
    {
      photo_path: photoPath,
      image_sha256: img.sha256,
      locale: currentLocale(),
      mode: 'label',
      keep_photo: false,
    },
    LabelResponseSchema,
  );
}

export async function askCoach(
  messages: { role: 'user' | 'assistant'; content: string }[],
  photo?: { img: PreparedImage; kind: 'fridge' | 'menu' },
): Promise<CoachResponse> {
  if (mocked()) {
    const quota = consumeMock('coach_message');
    await sleep(MOCK_DELAY_MS);
    return { reply: mockCoachReply(messages[messages.length - 1]?.content ?? ''), quota };
  }
  const photo_path = photo ? await uploadPhoto(photo.img) : undefined;
  return invokeFunction(
    'coach-chat',
    { messages, locale: currentLocale(), photo_path, photo_kind: photo?.kind },
    CoachResponseSchema,
  );
}

export async function generateMealPlan(
  budget: 'low' | 'mid' | 'high',
  days = 7,
  preferences?: MealPlanPreferences,
): Promise<MealPlan> {
  if (mocked()) {
    if (usePlanStore.getState().plan !== 'premium') throw new ApiError('PREMIUM_REQUIRED', 403);
    await sleep(MOCK_DELAY_MS);
    return mockMealPlan(days, preferences);
  }
  const res = await invokeFunction(
    'meal-plan',
    { locale: currentLocale(), budget, days, preferences },
    z.object({ plan: MealPlanSchema }),
  );
  return res.plan;
}

export async function fetchQuotaStatus(): Promise<QuotaStatus> {
  const plan = usePlanStore.getState().plan;
  if (mocked() || useSessionStore.getState().status !== 'authenticated') {
    const day = todayLocal();
    const u = mockUsage()[day] ?? { photo_scan: 0, text_query: 0, coach_message: 0 };
    const e = (kind: QuotaKind) => ({
      used: u[kind],
      limit: PLANS[plan].daily[kind],
      remaining: Math.max(0, PLANS[plan].daily[kind] - u[kind]),
    });
    return {
      plan,
      day,
      photo_scan: e('photo_scan'),
      text_query: e('text_query'),
      coach_message: e('coach_message'),
      bonus_photo_scans: 0,
      coach_trial_remaining:
        plan === 'free'
          ? Math.max(
              0,
              (PLANS.free.lifetimeTrial.coach_message ?? 0) - mockTrialsUsed('coach_message'),
            )
          : 0,
    };
  }
  return invokeFunction('quota-status', {}, QuotaStatusSchema);
}

/** "Reportar error": stores the original AI output and the user's correction for prompt tuning. */
export async function reportAiMistake(
  scanId: string | null,
  original: unknown,
  corrected: unknown,
  comment: string,
) {
  if (mocked() || useSessionStore.getState().status !== 'authenticated') return;
  const sb = requireSupabase();
  await sb.from('ai_feedback').insert({
    user_id: currentUserId(),
    scan_id: scanId,
    original: original as never,
    corrected: corrected as never,
    comment: comment.slice(0, 1000),
  });
}
