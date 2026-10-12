import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { currentLocale } from '@/i18n';
import { appendDictation } from './dictationText';

/** Pauses this long (ms) still count as the same dictation, so describing a meal can breathe. */
const SILENCE_MS = 6000;

/**
 * On-device speech-to-text (expo-speech-recognition). Each new recording is appended to the
 * text already in the field (`getBase`), and finished phrases accumulate during continuous
 * listening. Falls back gracefully when unavailable.
 */
export function useDictation(getBase: () => string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = useRef('');
  const committed = useRef('');
  /** Microphone level 0–1 (for the voice wave), updated without re-rendering. */
  const volume = useSharedValue(0);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    volume.set(0);
  });
  // Reported between -2 and 10; below 0 is silence.
  useSpeechRecognitionEvent('volumechange', (e) => {
    volume.set(Math.max(0, Math.min(1, e.value / 10)));
  });
  useSpeechRecognitionEvent('result', (e) => {
    const heard = e.results[0]?.transcript?.trim();
    if (!heard) return;
    if (e.isFinal) {
      committed.current = appendDictation(committed.current, heard);
      onText(appendDictation(base.current, committed.current));
    } else {
      onText(appendDictation(base.current, appendDictation(committed.current, heard)));
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    // "no-speech" just means silence: keep what was heard, without an error message.
    if (e.error !== 'no-speech') setError(e.error);
    setListening(false);
  });

  const available = (() => {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      return false;
    }
  })();

  const start = async () => {
    setError(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('not-allowed');
      return;
    }
    base.current = getBase();
    committed.current = '';
    ExpoSpeechRecognitionModule.start({
      lang: currentLocale(),
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCE_MS,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: SILENCE_MS,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: SILENCE_MS,
      },
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
    });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  /** Discards what was heard in this recording (the "De nuevo" button). */
  const reset = () => {
    committed.current = '';
    base.current = '';
  };

  return { listening, error, available, start, stop, reset, volume };
}
