import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Icon } from '@/components';
import { useProfile } from '@/features/profile/hooks';
import { auth } from '@/services/auth';
import { ensureFirstPull } from '@/services/sync/engine';
import { useSessionStore } from '@/stores/session';
import { spacing, useTheme } from '@/theme';

/** Entry gate: auth → onboarding → app. */
export default function Index() {
  const { t } = useTranslation();
  const status = useSessionStore((s) => s.status);
  const userId = useSessionStore((s) => s.userId);
  const profile = useProfile();
  const { colors } = useTheme();
  const notOnboarded = !!profile.data && !profile.data.onboarding_completed;
  // A signed-in account with no local profile may simply not have synced yet: ask the server
  // before sending an existing user through onboarding again.
  const firstPull = useQuery({
    queryKey: ['firstPull', userId],
    queryFn: ensureFirstPull,
    enabled: status === 'authenticated' && notOnboarded,
    retry: false,
  });

  const blank = <View style={{ flex: 1, backgroundColor: colors.background }} />;
  // While the session is restoring, or the profile is refreshing right after onboarding/sign-up,
  // wait instead of redirecting: an early redirect flashes the welcome/onboarding screen.
  if (status === 'loading') return blank;
  if (status === 'signedOut') return <Redirect href="/welcome" />;
  if (profile.isLoading || (profile.isFetching && !profile.data?.onboarding_completed))
    return blank;
  if (profile.data?.onboarding_completed) return <Redirect href="/today" />;
  if (status === 'authenticated') {
    if (firstPull.isFetching || firstPull.data === undefined)
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    if (!firstPull.data)
      return (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Icon name="cloud_off" size={40} color="textMuted" />
          <AppText variant="heading" align="center">
            {t('startup.offlineTitle')}
          </AppText>
          <AppText color="textMuted" align="center">
            {t('startup.offlineBody')}
          </AppText>
          <Button
            label={t('common.retry')}
            onPress={() => void firstPull.refetch()}
            testID="startup-retry"
          />
          <Button
            label={t('startup.otherAccount')}
            variant="ghost"
            onPress={() => void auth.signOut({ force: true })}
          />
        </View>
      );
  }
  return <Redirect href="/onboarding" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
});
