import { useEffect, useRef, useState } from 'react';

import { useDraftStore } from '@/features/diary/draftStore';
import { useScanStore } from '@/features/scan/store';
import { draftFromAnalysis } from '@/features/scan/toDraft';
import { useAiError } from '@/features/scan/useAiError';
import { analyzeMealPhoto } from '@/services/ai';
import { track } from '@/services/analytics';
import { prepareMealImage } from '@/services/image';
import { usePlan } from '@/services/purchases';
import { queryClient } from '@/services/queryClient';
import { usePrefsStore } from '@/stores/prefs';

export type ReviewPhase = 'analyzing' | 'review' | 'not_food' | 'error';

/**
 * Analyzes the scanned photo once on mount (or reuses a text/voice result) and starts the
 * meal draft from it.
 */
export function useMealAnalysis() {
  const scan = useScanStore();
  const start = useDraftStore((s) => s.start);
  const savePhotos = usePrefsStore((s) => s.savePhotos);
  const plan = usePlan();
  const aiError = useAiError();
  const [phase, setPhase] = useState<ReviewPhase>(
    scan.result ? (scan.result.is_food ? 'review' : 'not_food') : 'analyzing',
  );
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(scan.result?.notes ?? null);
  const started = useRef(false);

  const analyze = async () => {
    const photo = scan.photo;
    if (!photo) return;
    const t0 = Date.now();
    try {
      const img = await prepareMealImage(
        photo.uri,
        photo.width,
        photo.height,
        plan === 'premium' && savePhotos,
      );
      const { result, photoPath } = await analyzeMealPhoto(
        img,
        scan.mealType ?? undefined,
        scan.hint ?? undefined,
      );
      track('scan_completed', {
        ms: Date.now() - t0,
        items: result.items.length,
        cached: result.cached,
      });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      if (!result.is_food) {
        setNotes(result.notes);
        setPhase('not_food');
        return;
      }
      start(
        draftFromAnalysis(result, {
          source: 'photo',
          mealType: scan.mealType,
          date: scan.date,
          photoPath,
          localPhotoUri: savePhotos ? img.uri : null,
        }),
      );
      setPhase('review');
    } catch (e) {
      track('scan_failed');
      setError(aiError(e));
      setPhase('error');
    }
  };

  const retry = () => {
    setPhase('analyzing');
    setError(null);
    void analyze();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (scan.result) {
      start(draftFromAnalysis(scan.result, { source: scan.source, date: scan.date }));
    } else {
      // State updates happen after awaits (async analysis), not synchronously in the effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { phase, error, notes, retry };
}
