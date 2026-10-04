import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useState } from 'react';

import { currentLocale } from '@/i18n';

/** On-device speech-to-text (expo-speech-recognition). Falls back gracefully when unavailable. */
export function useDictation(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript;
    if (text) onText(text, e.isFinal);
  });
  useSpeechRecognitionEvent('error', (e) => {
    setError(e.error);
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
    ExpoSpeechRecognitionModule.start({
      lang: currentLocale(),
      interimResults: true,
      continuous: false,
    });
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return { listening, error, available, start, stop };
}
