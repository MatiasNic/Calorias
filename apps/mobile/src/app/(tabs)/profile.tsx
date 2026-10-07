import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Icon,
  ListRow,
  ProgressBar,
  Screen,
  SectionHeader,
  toast,
} from '@/components';
import { env } from '@/config/env';
import { features } from '@/config/features';
import { useStreak } from '@/features/habits/hooks';
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
import { MIN_TOUCH, palette, radii, spacing, useTheme } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';

export default function Profile() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { colors } = theme;
  const session = useSessionStore();
  const profile = useProfile();
  const planState = usePlanStore();
  const quota = useQuotaStatus();
  const sync = useSyncStatus();
  const pending = useQuery({ queryKey: ['db', 'pending'], queryFn: auth.pendingChanges });
  const premium = planState.plan === 'premium';
  const isGuest = session.status === 'guest';
  const streak = useStreak();
  const onDark = theme.dark ? colors.text : colors.onPrimary;
  const name =
    profile.data?.display_name ||
    (isGuest
      ? session.demo
        ? t('profile.demo')
        : t('profile.guest')
      : (session.email?.split('@')[0] ?? t('profile.title')));

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
      chevron={premium}
      right={premium ? undefined : <Icon name="lock-closed-outline" size={18} color="textSubtle" />}
      onPress={() => router.push(href as never)}
    />
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
          <AppText variant="heading">{name.charAt(0).toUpperCase()}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {[
              premium
                ? t('common.premium')
                : `${t('profile.plan')} ${t('profile.free').toLowerCase()}`,
              streak.data?.current
                ? t('profile.streakShort', { count: streak.data.current })
                : null,
              session.email,
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
      </View>

      {isGuest && !env.useMocks ? (
        <Banner tone="info" message={t('profile.createAccount')} />
      ) : null}
      {isGuest && !env.useMocks ? (
        <Button label={t('welcome.createAccount')} onPress={() => router.push('/sign-up')} />
      ) : null}

      {premium ? (
        <Card style={styles.planCard}>
          <View style={styles.row}>
            <Icon name="sparkles-outline" color="text" />
            <AppText variant="subheading" style={styles.flex}>
              {planState.expiresAt
                ? t(planState.isTrial ? 'profile.premiumTrial' : 'profile.premiumUntil', {
                    date: formatDay(planState.expiresAt.slice(0, 10), {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                  })
                : t('common.premium')}
            </AppText>
          </View>
          <Button
            label={t('profile.manageSubscription')}
            variant="outline"
            size="md"
            onPress={manage}
          />
        </Card>
      ) : (
        <View style={[styles.planCard, styles.upsell, { backgroundColor: colors.tabBar }]}>
          {quota.data ? (
            <>
              <View style={styles.row}>
                <AppText variant="bodyStrong" style={[styles.flex, { color: onDark }]}>
                  {t('profile.scansToday')}
                </AppText>
                <AppText variant="bodyStrong" tabular style={{ color: onDark }}>
                  {quota.data.photo_scan.used} / {quota.data.photo_scan.limit}
                </AppText>
              </View>
              <ProgressBar
                progress={quota.data.photo_scan.used / Math.max(1, quota.data.photo_scan.limit)}
                color={colors.accent}
              />
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.upgrade')}
            onPress={() => router.push({ pathname: '/paywall', params: { context: 'settings' } })}
            testID="profile-upgrade"
            style={({ pressed }) => [
              styles.upgrade,
              { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="sparkles" size={18} rawColor={palette.ink800} />
            <AppText variant="bodyStrong" style={{ color: palette.ink800 }}>
              {t('profile.upgrade')}
            </AppText>
          </Pressable>
        </View>
      )}

      <SectionHeader title={t('profile.goals')} />
      <Card padded={false}>
        <ListRow
          icon="flag-outline"
          title={t('goals.editTitle')}
          onPress={() => router.push('/goals')}
        />
        <ListRow
          icon="trophy-outline"
          title={t('profile.achievements')}
          onPress={() => router.push('/achievements')}
        />
        <ListRow
          icon="book-outline"
          title={t('profile.recipes')}
          onPress={() => router.push('/recipes')}
        />
        <ListRow
          icon="barbell-outline"
          title={t('profile.training')}
          onPress={() => router.push('/training')}
        />
        <ListRow
          icon="medkit-outline"
          title={t('profile.supplements')}
          onPress={() => router.push('/supplements')}
        />
      </Card>

      <SectionHeader title={t('common.premium')} />
      <Card padded={false}>
        {premiumRow(t('profile.coach'), 'chatbubbles-outline', '/coach')}
        {premiumRow(t('profile.mealPlan'), 'calendar-outline', '/meal-plan')}
        {premiumRow(t('profile.adaptive'), 'pulse-outline', '/adaptive')}
        {premiumRow(t('profile.micros'), 'nutrition-outline', '/micros')}
        {features.healthSync && isHealthSupported() ? (
          <ListRow
            icon="heart-outline"
            title={t('profile.healthSync')}
            value={premium ? undefined : t('common.premium')}
            onPress={connectHealth}
          />
        ) : null}
      </Card>

      <SectionHeader title={t('settings.title')} />
      <Card padded={false}>
        <ListRow
          icon="notifications-outline"
          title={t('profile.reminders')}
          onPress={() => router.push('/settings/reminders')}
        />
        <ListRow
          icon="options-outline"
          title={t('profile.preferences')}
          onPress={() => router.push('/settings/preferences')}
        />
        <ListRow
          icon="shield-checkmark-outline"
          title={t('profile.privacy')}
          onPress={() => router.push('/settings/privacy')}
          testID="profile-privacy"
        />
        <ListRow
          icon="help-buoy-outline"
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
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  planCard: { gap: spacing.md },
  upsell: { borderRadius: radii.xxl, padding: spacing.lg },
  upgrade: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    borderRadius: radii.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
