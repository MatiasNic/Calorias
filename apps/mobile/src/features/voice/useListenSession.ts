import type { IsoDate } from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { env } from '@/config/env';
import { openTextAnalysis } from '@/features/scan/textRequest';
import { useDictation } from '@/features/scan/useDictation';
import { useUiStore } from '@/stores/ui';
import { dateParam } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

/** Demo mode without a speech engine (web, emulators): "dictates" the example word by word. */
const DEMO_WORD_MS = 240;

/**
 * State and actions of the "Escuchando" screen: dictation (or the demo), the elapsed timer and
 * the exits ("Listo" analyzes, "Escribir" moves to the keyboard, "De nuevo" starts over).
 */
export function useListenSession() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: IsoDate; text?: string }>();
  const [date] = useState<IsoDate>(
    () => dateParam(params.date) ?? useUiStore.getState().selectedDate,
  );
  // Coming back from the keyboard keeps what was written; new words are added after it.
  const [text, setText] = useState(params.text ?? '');
  const [seconds, setSeconds] = useState(0);
  const [demo, setDemo] = useState(false);
  const textRef = useRef('');
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const dictation = useDictation(() => textRef.current, setText);
  const demoVolume = useSharedValue(0.7);
  const listening = dictation.listening || demo;

  const startDemo = () => {
    const words = t('listen.demoPhrase').split(' ');
    setText('');
    setDemo(true);
    words.forEach((_, i) =>
      setTimeout(() => setText(words.slice(0, i + 1).join(' ')), (i + 1) * DEMO_WORD_MS),
    );
    setTimeout(() => setDemo(false), (words.length + 1) * DEMO_WORD_MS);
  };

  const start = () => {
    setSeconds(0);
    // The web demo has no reliable speech engine: it plays the example instead.
    if (env.useMocks && (Platform.OS === 'web' || !dictation.available)) startDemo();
    else if (dictation.available) void dictation.start();
    else router.replace({ pathname: '/text-log', params: { date } });
  };

  useEffect(() => {
    // Starts the recognizer (or the demo); its state updates come from events and timers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  const stop = () => {
    if (dictation.listening) dictation.stop();
  };
  const cancel = () => {
    stop();
    router.back();
  };
  const write = () => {
    stop();
    router.replace({ pathname: '/text-log', params: { date, text: textRef.current } });
  };
  const again = () => {
    stop();
    dictation.reset();
    setText('');
    setTimeout(start, 150);
  };
  const done = () => {
    stop();
    const said = textRef.current.trim();
    if (said.length < 2) return write();
    haptic('success');
    openTextAnalysis({ text: said, source: 'voice', date });
  };

  return {
    text,
    seconds,
    listening,
    volume: demo ? demoVolume : dictation.volume,
    cancel,
    write,
    again,
    done,
  };
}
