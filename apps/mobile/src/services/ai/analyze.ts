import {
  AnalyzeResponseSchema,
  LabelResponseSchema,
  mockAnalyzeImage,
  mockAnalyzeText,
  mockReadLabel,
  type AnalyzeResponse,
  type LabelResponse,
  type MealType,
  type PreviousItem,
} from '@bocado/shared';

import { currentLocale } from '@/i18n';
import { invokeFunction } from '@/services/api/client';
import type { PreparedImage } from '@/services/image';
import { requireSupabase } from '@/services/supabase/client';
import { usePrefsStore } from '@/stores/prefs';
import { currentUserId, useSessionStore } from '@/stores/session';
import { mocked, MOCK_DELAY_MS, sleep } from './mode';
import { withUploadedPhoto } from './photos';
import { consumeMock } from './quota';

export interface PhotoAnalysis {
  result: AnalyzeResponse;
  photoPath: string | null;
}

export async function analyzeMealPhoto(
  img: PreparedImage,
  mealType?: MealType,
  /** What the user said about the photo ("es de pollo, sin aceite"). */
  hint?: string,
): Promise<PhotoAnalysis> {
  if (mocked()) {
    const quota = consumeMock('photo_scan');
    await sleep(MOCK_DELAY_MS);
    const { mockResponse } = await import('./mock');
    return { result: mockResponse(mockAnalyzeImage(img.sha256), quota), photoPath: null };
  }
  const keep = usePrefsStore.getState().savePhotos;
  return withUploadedPhoto(img, async (photoPath) => {
    const result = await invokeFunction(
      'analyze-meal',
      {
        photo_path: photoPath,
        image_sha256: img.sha256,
        locale: currentLocale(),
        meal_type: mealType,
        mode: 'meal',
        keep_photo: keep,
        hint: hint?.trim() || undefined,
      },
      AnalyzeResponseSchema,
    );
    return { result, photoPath: keep ? photoPath : null };
  });
}

export async function analyzeMealText(
  text: string,
  source: 'text' | 'voice' | 'recipe' = 'text',
  /** Present → `text` corrects these items and the response is the full corrected list. */
  previous?: PreviousItem[],
): Promise<AnalyzeResponse> {
  if (mocked()) {
    const quota = consumeMock('text_query');
    await sleep(MOCK_DELAY_MS / 2);
    const { mockResponse } = await import('./mock');
    return mockResponse(mockAnalyzeText(text), quota);
  }
  return invokeFunction(
    'analyze-text',
    {
      text,
      locale: currentLocale(),
      source,
      previous_items: previous?.length ? previous : undefined,
    },
    AnalyzeResponseSchema,
  );
}

export async function readNutritionLabel(img: PreparedImage): Promise<LabelResponse> {
  if (mocked()) {
    const quota = consumeMock('photo_scan');
    await sleep(MOCK_DELAY_MS);
    return { scan_id: null, label: mockReadLabel(), quota };
  }
  return withUploadedPhoto(img, (photoPath) =>
    invokeFunction(
      'analyze-meal',
      {
        photo_path: photoPath,
        image_sha256: img.sha256,
        locale: currentLocale(),
        mode: 'label',
        keep_photo: false,
      },
      LabelResponseSchema,
    ),
  );
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
