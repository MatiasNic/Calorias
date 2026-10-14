import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Options {
  /** Alert texts; default to the generic "discard changes?". */
  title?: string;
  message?: string;
  confirm?: string;
  /** Runs when the user confirms leaving (e.g. clear a store the screen does not own). */
  onDiscard?: () => void;
  /**
   * Re-checks at the moment of leaving: another screen may already have cleared the work in
   * the same tick (e.g. the plate saved from the editor on top) before this screen re-rendered.
   */
  stillDirty?: () => boolean;
}

/**
 * Leaving the screen (close/back button, Android back, iOS swipe) works as usual and only asks
 * first while `dirty`, i.e. when there is something to lose. Returns `allowLeave`: call it right
 * before a navigation that must not ask (after saving or deleting, or handing the work over to
 * another screen).
 */
export function useConfirmLeave(dirty: boolean, options: Options = {}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const allowed = useRef(false);

  usePreventRemove(dirty, ({ data }) => {
    const leave = () => navigation.dispatch(data.action);
    if (allowed.current || (options.stillDirty && !options.stillDirty())) return leave();
    Alert.alert(
      options.title ?? t('common.discardChangesTitle'),
      options.message ?? t('common.discardChangesBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: options.confirm ?? t('common.discard'),
          style: 'destructive',
          onPress: () => {
            options.onDiscard?.();
            leave();
          },
        },
      ],
    );
  });

  return useCallback(() => {
    allowed.current = true;
  }, []);
}
