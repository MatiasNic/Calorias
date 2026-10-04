import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Icon,
  ListRow,
  Screen,
  SectionHeader,
  toast,
} from '@/components';
import { env } from '@/config/env';
import { features } from '@/config/features';
import { useProfile } from '@/features/profile/hooks';
import { useQuotaStatus } from '@/features/scan/useQuota';
import { auth } from '@/services/auth';
import { logWeight } from '@/features/body/hooks';
import { isHealthSupported, readLatestWeightKg, requestHealthPermissions } from '@/services/health';
import {
  mockCancelSubscription,
  openCustomerCenter,
  purchasesAreMocked,
  usePlanStore,
} from '@/services/purchases';
import { useSyncStatus } from '@/services/sync/engine';
import { useSessionStore } from '@/stores/session';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';

export default function Profile() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSessionStore();
  const profile = useProfile();
  const planState = usePlanStore();
  const quota = useQuotaStatus();
  const sync = useSyncStatus();
  const pending = useQuery({ queryKey: ['db', 'pending'], queryFn: auth.pendingChanges });
  const premium = planState.plan === 'premium';
  const isGuest = session.status === 'guest';

  const signOut = () => {
    const count = pending.data ?? 0;
    Alert.alert(
      t('profile.signOutTitle'),
      count && !sync.online ? t('profile.signOutPending', { count }) : undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: () => auth.signOut().then(() => router.replace('/welcome')),
        },
      ],
    );
  };

  const manage = async () => {
    if (purchasesAreMocked()) {
      Alert.alert(t('profile.manageSubscription'), t('paywall.sandboxNote'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.mockPremium'), style: 'destructive', onPress: mockCancelSubscription },
      ]);
      return;
    }
    await openCustomerCenter();
  };

  const connectHealth = async () => {
    if (!premium) return router.push({ pathname: '/paywall', params: { context: 'feature' } });
    if (await requestHealthPermissions()) {
      const w = await readLatestWeightKg();
      if (w) await logWeight(todayLocal(), w.kg, 'health');
      toast.success(t('common.done'));
    }
  };

  const premiumRow = (title: string, icon: Parameters<typeof ListRow>[0]['icon'], href: string) => (
    <ListRow
      icon={icon}
      title={title}
      value={premium ? undefined : t('common.premium')}
      onPress={() => router.push(href as never)}
    />
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Icon name="person" color="primary" size={30} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" numberOfLines={1}>
            {profile.data?.display_name ||
              (isGuest
                ? session.demo
                  ? t('profile.demo')
                  : t('profile.guest')
                : (session.email ?? t('profile.title')))}
          </AppText>
          {session.email ? (
            <AppText variant="caption" color="textMuted">
              {session.email}
            </AppText>
          ) : null}
        </View>
      </View>

      {isGuest && !env.useMocks ? (
        <Banner tone="info" message={t('profile.createAccount')} />
      ) : null}
      {isGuest && !env.useMocks ? (
        <Button label={t('welcome.createAccount')} onPress={() => router.push('/sign-up')} />
      ) : null}

      <Card style={styles.planCard}>
        <View style={styles.row}>
          <Icon name={premium ? 'sparkles' : 'leaf'} color="primary" />
          <AppText variant="subheading" style={styles.flex}>
            {premium
              ? planState.expiresAt
                ? t(planState.isTrial ? 'profile.premiumTrial' : 'profile.premiumUntil', {
                    date: formatDay(planState.expiresAt.slice(0, 10), {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                  })
                : t('common.premium')
              : `${t('profile.plan')}: ${t('profile.free')}`}
          </AppText>
        </View>
        {quota.data && !premium ? (
          <AppText variant="caption" color="textMuted">
            {t('profile.scansToday')}: {quota.data.photo_scan.used}/{quota.data.photo_scan.limit}
          </AppText>
        ) : null}
        {premium ? (
          <Button
            label={t('profile.manageSubscription')}
            variant="outline"
            size="md"
            onPress={manage}
          />
        ) : (
          <Button
            label={t('profile.upgrade')}
            icon="sparkles"
            size="md"
            onPress={() => router.push({ pathname: '/paywall', params: { context: 'settings' } })}
            testID="profile-upgrade"
          />
        )}
      </Card>

      <SectionHeader title={t('profile.goals')} />
      <Card padded={false}>
        <ListRow icon="flag" title={t('goals.editTitle')} onPress={() => router.push('/goals')} />
        <ListRow
          icon="trophy"
          title={t('profile.achievements')}
          onPress={() => router.push('/achievements')}
        />
        <ListRow icon="book" title={t('profile.recipes')} onPress={() => router.push('/recipes')} />
      </Card>

      <SectionHeader title={t('common.premium')} />
      <Card padded={false}>
        {premiumRow(t('profile.coach'), 'chatbubbles', '/coach')}
        {premiumRow(t('profile.mealPlan'), 'calendar', '/meal-plan')}
        {premiumRow(t('profile.adaptive'), 'analytics', '/adaptive')}
        {premiumRow(t('profile.micros'), 'nutrition', '/micros')}
        {features.healthSync && isHealthSupported() ? (
          <ListRow
            icon="heart"
            title={t('profile.healthSync')}
            value={premium ? undefined : t('common.premium')}
            onPress={connectHealth}
          />
        ) : null}
      </Card>

      <SectionHeader title={t('settings.title')} />
      <Card padded={false}>
        <ListRow
          icon="notifications"
          title={t('profile.reminders')}
          onPress={() => router.push('/settings/reminders')}
        />
        <ListRow
          icon="options"
          title={t('profile.preferences')}
          onPress={() => router.push('/settings/preferences')}
        />
        <ListRow
          icon="shield-checkmark"
          title={t('profile.privacy')}
          onPress={() => router.push('/settings/privacy')}
          testID="profile-privacy"
        />
        <ListRow
          icon="help-buoy"
          title={t('profile.help')}
          onPress={() => router.push('/settings/about')}
        />
      </Card>

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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  planCard: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
