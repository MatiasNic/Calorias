import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { auth } from '@/services/auth';
import { useSyncStatus } from '@/services/sync/engine';

/**
 * Sign-out with confirmation. Warns when there are pending changes offline and, if some could not
 * be uploaded, asks again before discarding them.
 */
export function useSignOut() {
  const { t } = useTranslation();
  const sync = useSyncStatus();
  const pending = useQuery({ queryKey: ['db', 'pending'], queryFn: auth.pendingChanges });

  const doSignOut = async (force: boolean) => {
    const { unsynced } = await auth.signOut({ force });
    if (!unsynced) return router.replace('/welcome');
    // Some changes could not be uploaded: never lose them without asking.
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutUnsynced', { count: unsynced }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOutAnyway'),
        style: 'destructive',
        onPress: () => void doSignOut(true),
      },
    ]);
  };

  return () => {
    const count = pending.data ?? 0;
    Alert.alert(
      t('profile.signOutTitle'),
      count && !sync.online ? t('profile.signOutPending', { count }) : undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: () => void doSignOut(false),
        },
      ],
    );
  };
}
