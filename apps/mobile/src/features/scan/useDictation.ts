import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useRef, useState } from 'react';

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

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
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
    });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return { listening, error, available, start, stop };
}
