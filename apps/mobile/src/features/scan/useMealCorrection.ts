import { mockAnalyzeText } from '@plato/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { env } from '@/config/env';
import { useDraftStore } from '@/features/diary/draftStore';
import { makeItem } from '@/features/diary/mealMath';
import { getRegionalFood } from '@/features/foods/search';
import { analyzeMealText } from '@/services/ai';
import { track } from '@/services/analytics';
import { queryClient } from '@/services/queryClient';
import { diffItems } from './correctionDiff';
import { applyLocalCorrection } from './localCorrection';
import { analysisToItems } from './toDraft';
import { useAiError } from './useAiError';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * "Corregir con la voz": the user says what's wrong ("era al horno y sin puré") or taps a quick
 * answer, and the AI returns the whole corrected list, which replaces the draft's items.
 */
export function useMealCorrection() {
  const { t } = useTranslation();
  const aiError = useAiError();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correct = async (text: string, source: 'text' | 'voice' = 'text'): Promise<boolean> => {
    const draft = useDraftStore.getState().draft;
    const clean = text.trim();
    if (!draft || clean.length < 2) return false;
    setBusy(true);
    setError(null);
    const previous = {
      items: draft.items,
      itemMeals: draft.itemMeals,
      hiddenQuestion: draft.hiddenQuestion,
      quickAnswers: draft.quickAnswers,
    };
    const remember = () => {
      const now = useDraftStore.getState().draft;
      if (!now) return;
      useDraftStore.getState().patch({
        lastCorrection: { text: clean, changes: diffItems(previous.items, now.items), previous },
      });
    };
    try {
      if (env.useMocks) {
        await sleep(600);
        const items = applyLocalCorrection(draft.items, clean, {
          parse: demoItemsFromText,
          oil: () => {
            const oil = getRegionalFood('aceite_girasol');
            return oil ? makeItem(oil, 13) : null;
          },
        });
        useDraftStore.getState().patch({ items, hiddenQuestion: null, quickAnswers: [] });
        remember();
      } else {
        const result = await analyzeMealText(
          clean,
          source,
          draft.items.map((i) => ({
            name: i.display_name,
            grams: Math.round(i.grams),
            cooking_method: i.cooking_method,
          })),
        );
        queryClient.invalidateQueries({ queryKey: ['quota'] });
        if (!result.is_food || !result.items.length) {
          setError(t('review.correctionFailed'));
          return false;
        }
        const { items, itemMeals } = analysisToItems(result);
        useDraftStore.getState().patch({
          items: items.map((i) => ({ ...i, user_edited: true })),
          itemMeals: Object.keys(itemMeals).length ? itemMeals : {},
          hiddenQuestion: result.hidden_ingredients_question,
          quickAnswers: result.quick_answers,
        });
        remember();
      }
      track('meal_corrected', { source });
      return true;
    } catch (e) {
      setError(aiError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Puts back the list as it was before the last correction. */
  const undo = () => {
    const last = useDraftStore.getState().draft?.lastCorrection;
    if (!last) return;
    useDraftStore.getState().patch({ ...last.previous, lastCorrection: null });
  };

  return { correct, undo, busy, error };
}

/** Demo parser → draft items (the AI's own estimate, no network). */
function demoItemsFromText(text: string) {
  return mockAnalyzeText(text).items.map((it) =>
    makeItem(
      { id: null, source: 'ai', name: it.name, per100g: it.per_100g_estimate },
      it.estimated_grams,
      {
        serving_unit: it.household_measure,
        cooking_method: it.cooking_method,
      },
    ),
  );
}
