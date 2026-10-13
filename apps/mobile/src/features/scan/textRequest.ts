import type { IsoDate } from '@bocado/shared';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';

export interface TextAnalysisRequest {
  text: string;
  source: 'voice' | 'text';
  date: IsoDate | null;
}

let pending: (TextAnalysisRequest & { id: string }) | null = null;

/**
 * Opens "Analizando…" for text the user typed or said in the app. The text travels in memory,
 * not in the URL, so a link from outside (bocado://analyzing?text=…) can't spend the user's AI
 * quota or feed it text on its own.
 */
export function openTextAnalysis(req: TextAnalysisRequest, mode: 'push' | 'replace' = 'replace') {
  const id = Crypto.randomUUID();
  pending = { ...req, id };
  router[mode]({ pathname: '/analyzing', params: { id } });
}

/** The request opened with `id`, or null when the screen was opened any other way. */
export function textAnalysisFor(id: string | undefined): TextAnalysisRequest | null {
  return pending && id && pending.id === id ? pending : null;
}
