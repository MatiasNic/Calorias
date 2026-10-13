import { useEffect, useRef, useState } from 'react';

import { useDictation } from '@/features/scan/useDictation';

/** Appends a quick-hint phrase to the words already typed or dictated. */
export function appendHint(current: string, words: string): string {
  return current.trim() ? `${current.trim().replace(/[,.]$/, '')}, ${words.toLowerCase()}` : words;
}

/**
 * Optional words about the photo ("es de pollo, sin aceite") that guide the AI, typed,
 * dictated or added from quick hints.
 */
export function useScanHint() {
  const [hint, setHint] = useState('');
  const hintRef = useRef('');
  useEffect(() => {
    hintRef.current = hint;
  }, [hint]);
  const dictation = useDictation(() => hintRef.current, setHint);
  const addHint = (words: string) => setHint((h) => appendHint(h, words));
  return { hint, setHint, addHint, dictation };
}

export type ScanHint = ReturnType<typeof useScanHint>;
