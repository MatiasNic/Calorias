import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { currentLocale } from '@/i18n';
import { appendDictation } from './dictationText';

/** Pauses this long (ms) still count as the same dictation, so describing a meal can breathe. */
const SILENCE_MS = 6000;

/** The field currently dictating: recognition events are global, only its owner uses them. */
let activeOwner: object | null = null;
/**
 * False between our start() and the recognizer's 'start' event: the 'end' of a session we just
 * aborted (another field, or the voice screen left running) arrives late and must not stop ours.
 */
let sessionLive = false;

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
  const [me] = useState(() => ({}));
  const mine = () => activeOwner === me;

  useSpeechRecognitionEvent('start', () => {
    if (!mine()) return;
    sessionLive = true;
    setListening(true);
  });
  useSpeechRecognitionEvent('end', () => {
    if (!sessionLive) return; // late end of an aborted session
    sessionLive = false;
    // Every field stops showing "listening"; only the owner releases the recognizer.
    setListening(false);
    volume.set(0);
    if (mine()) activeOwner = null;
  });
  // Reported between -2 and 10; below 0 is silence.
  useSpeechRecognitionEvent('volumechange', (e) => {
    if (mine()) volume.set(Math.max(0, Math.min(1, e.value / 10)));
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (!mine()) return;
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
    // "aborted" is us stopping a previous session to start this one.
    if (!mine() || e.error === 'aborted') return;
    // "no-speech" just means silence: keep what was heard, without an error message.
    if (e.error !== 'no-speech') setError(e.error);
    setListening(false);
  });

  const available = (() => {
    try {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch {
      // Native module missing (e.g. Expo Go): dictation is simply unavailable.
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
    // Whatever was still listening (another field, or the voice screen) stops first.
    if (activeOwner || sessionLive) ExpoSpeechRecognitionModule.abort();
    sessionLive = false;
    activeOwner = me;
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
