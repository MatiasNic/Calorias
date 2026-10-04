import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { usePrefsStore } from '@/stores/prefs';

type Kind = 'light' | 'medium' | 'success' | 'warning' | 'selection';

export function haptic(kind: Kind = 'light') {
  if (Platform.OS === 'web' || !usePrefsStore.getState().hapticsEnabled) return;
  const run = () => {
    switch (kind) {
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'selection':
        return Haptics.selectionAsync();
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      default:
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  run().catch(() => undefined);
}
