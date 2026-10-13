import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, Screen } from '@/components';
import { env } from '@/config/env';
import { PlanCard } from '@/features/profile/PlanCard';
import { ProfileHeader } from '@/features/profile/ProfileHeader';
import { GoalsMenu, PremiumMenu, SettingsMenu } from '@/features/profile/ProfileMenus';
import { useSignOut } from '@/features/profile/useSignOut';
import { usePlanStore } from '@/services/purchases';
import { useSyncStatus } from '@/services/sync/engine';
import { useSessionStore } from '@/stores/session';

export default function Profile() {
  const { t } = useTranslation();
  const session = useSessionStore();
  const premium = usePlanStore((s) => s.plan) === 'premium';
  const sync = useSyncStatus();
  const signOut = useSignOut();
  const isGuest = session.status === 'guest';

  return (
    <Screen>
      <ProfileHeader premium={premium} />

      {isGuest && !env.useMocks ? (
        <Banner tone="info" message={t('profile.createAccount')} />
      ) : null}
      {isGuest && !env.useMocks ? (
        <Button label={t('welcome.createAccount')} onPress={() => router.push('/sign-up')} />
      ) : null}

      <PlanCard />
      <GoalsMenu />
      <PremiumMenu premium={premium} />
      <SettingsMenu />

      {session.status === 'authenticated' ? (
        <AppText variant="caption" color={sync.lastError ? 'danger' : 'textMuted'} align="center">
          {sync.lastError
            ? t('profile.syncError')
            : sync.lastSyncedAt
              ? t('profile.syncStatus', { when: new Date(sync.lastSyncedAt).toLocaleTimeString() })
              : ''}
        </AppText>
      ) : null}
      <Button
        label={t('profile.signOut')}
        variant="ghost"
        icon="log-out-outline"
        onPress={signOut}
        testID="profile-sign-out"
      />
      <AppText variant="caption" color="textSubtle" align="center">
        {t('profile.version', { version: Constants.expoConfig?.version ?? '0.1.0' })}
      </AppText>
    </Screen>
  );
}
