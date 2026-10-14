import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useDraftStore } from '@/features/diary/draftStore';
import { useScanStore } from '@/features/scan/store';

import type { ReviewPhase } from './useMealAnalysis';

/**
 * Leaving the review (close button or Android back) drops the draft and the scan, asking
 * first once there is a draft to lose.
 */
export function useDiscardReview(phase: ReviewPhase) {
  const { t } = useTranslation();
  const clear = useDraftStore((s) => s.clear);
  const clearScan = useScanStore((s) => s.clear);

  const discard = () => {
    const leave = () => {
      clear();
      clearScan();
      router.back();
    };
    if (phase !== 'review') return leave();
    Alert.alert(t('review.discardTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('review.discard'), style: 'destructive', onPress: leave },
    ]);
  };

  // Only while the review is the visible screen: with the food search (or a food) opened on
  // top, Android back must close that screen, not discard the whole meal underneath.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        discard();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]),
  );

  return discard;
}
