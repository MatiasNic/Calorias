import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, ProgressBar } from '@/components';
import { useQuotaStatus } from '@/features/scan/useQuota';
import {
  mockCancelSubscription,
  openCustomerCenter,
  purchasesAreMocked,
  usePlanStore,
} from '@/services/purchases';
import { MIN_TOUCH, radii, spacing, useTheme } from '@/theme';
import { formatDay } from '@/utils/dates';

/** Premium: renewal date and "manage subscription". Free: today's scans and the upgrade CTA. */
export function PlanCard() {
  const planState = usePlanStore();
  // Fetched on every plan (it keeps the quota cache fresh), only shown on free.
  const quota = useQuotaStatus();
  return planState.plan === 'premium' ? (
    <PremiumPlanCard expiresAt={planState.expiresAt} isTrial={planState.isTrial} />
  ) : (
    <UpgradeCard photoScan={quota.data?.photo_scan} />
  );
}

function PremiumPlanCard({ expiresAt, isTrial }: { expiresAt: string | null; isTrial: boolean }) {
  const { t } = useTranslation();

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

  return (
    <Card style={styles.planCard}>
      <View style={styles.row}>
        <Icon name="sparkles-outline" color="text" />
        <AppText variant="subheading" style={styles.flex}>
          {expiresAt
            ? t(isTrial ? 'profile.premiumTrial' : 'profile.premiumUntil', {
                date: formatDay(expiresAt.slice(0, 10), {
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
  );
}

function UpgradeCard({ photoScan }: { photoScan?: { used: number; limit: number } }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.planCard, styles.upsell, { backgroundColor: colors.surface }]}>
      {photoScan ? (
        <>
          <View style={styles.row}>
            <AppText variant="bodyStrong" style={styles.flex}>
              {t('profile.scansToday')}
            </AppText>
            <AppText variant="bodyStrong" tabular>
              {photoScan.used} / {photoScan.limit}
            </AppText>
          </View>
          <ProgressBar
            progress={photoScan.used / Math.max(1, photoScan.limit)}
            color={colors.text}
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
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Icon name="auto_awesome" size={18} color="onPrimary" />
        <AppText variant="bodyStrong" color="onPrimary">
          {t('profile.upgrade')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
