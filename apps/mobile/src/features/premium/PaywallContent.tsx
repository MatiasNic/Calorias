import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import {
  AppLogo,
  AppText,
  Banner,
  Button,
  Icon,
  IconButton,
  toast,
  type IconName,
} from '@/components';
import { LegalText } from '@/features/auth/LegalLinks';
import { track } from '@/services/analytics';
import {
  getPackages,
  purchase,
  purchasesAreMocked,
  restorePurchases,
  type PlanPackage,
} from '@/services/purchases';
import { palette, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';

export type PaywallContext = 'onboarding' | 'quota' | 'feature' | 'settings';

const BENEFITS: {
  icon: IconName;
  key: 'scans' | 'coach' | 'adaptive' | 'micros' | 'plan' | 'history';
}[] = [
  { icon: 'camera', key: 'scans' },
  { icon: 'chatbubbles', key: 'coach' },
  { icon: 'analytics', key: 'adaptive' },
  { icon: 'nutrition', key: 'micros' },
  { icon: 'calendar', key: 'plan' },
  { icon: 'time', key: 'history' },
];

export function PaywallContent({
  context,
  onClose,
}: {
  context: PaywallContext;
  onClose: (purchased: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const packages = useQuery({
    queryKey: ['paywall', 'packages'],
    queryFn: getPackages,
    staleTime: 5 * 60_000,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    track('paywall_viewed', { context });
  }, [context]);

  const list = packages.data ?? [];
  const annual = list.find((p) => p.kind === 'annual');
  const monthly = list.find((p) => p.kind === 'monthly');
  const current = list.find((p) => p.id === selected) ?? annual ?? list[0];
  const savings =
    annual && monthly && monthly.price > 0
      ? Math.round((1 - annual.price / (monthly.price * 12)) * 100)
      : null;

  const buy = async () => {
    if (!current) return;
    setBusy('buy');
    const outcome = await purchase(current);
    setBusy(null);
    if (outcome === 'purchased') {
      haptic('success');
      track('paywall_purchase', { context, product: current.productId });
      toast.success(t('paywall.welcomePremium'));
      onClose(true);
    } else if (outcome === 'error') {
      toast.error(t('paywall.purchaseError'));
    } else if (outcome === 'unavailable') {
      toast.info(t('paywall.unavailable'));
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const ok = await restorePurchases();
      toast[ok ? 'success' : 'info'](t(ok ? 'paywall.restored' : 'paywall.nothingToRestore'));
      if (ok) onClose(true);
    } catch {
      toast.error(t('common.errorMessage'));
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    track('paywall_dismissed', { context });
    onClose(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppLogo size={32} />
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={close}
          testID="paywall-close"
        />
      </View>
      <Animated.View entering={FadeInDown} style={styles.hero}>
        <AppText variant="title" accessibilityRole="header">
          {t(`paywall.title.${context}`)}
        </AppText>
        <AppText color="textMuted">{t('paywall.subtitle')}</AppText>
      </Animated.View>

      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.key} style={styles.benefit}>
            <Icon name="checkmark" color="text" size={20} />
            <AppText variant="label" style={styles.flex}>
              {t(`paywall.benefits.${b.key}`)}
            </AppText>
          </View>
        ))}
      </View>

      {packages.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {packages.isError ? <Banner tone="danger" message={t('paywall.loadError')} /> : null}

      <View style={styles.packages} accessibilityRole="radiogroup">
        {list.map((p) => (
          <PackageOption
            key={p.id}
            pkg={p}
            selected={current?.id === p.id}
            savings={p.kind === 'annual' ? savings : null}
            onPress={() => setSelected(p.id)}
          />
        ))}
      </View>

      {current ? (
        <AppText variant="caption" color="textMuted" align="center">
          {current.trialDays
            ? t('paywall.trialTerms', {
                days: current.trialDays,
                price: current.priceString,
                period: t(`paywall.period.${current.kind}`),
              })
            : t('paywall.renewTerms', {
                price: current.priceString,
                period: t(`paywall.period.${current.kind}`),
              })}
        </AppText>
      ) : null}

      <Button
        label={
          current?.trialDays ? t('paywall.ctaTrial', { days: current.trialDays }) : t('paywall.cta')
        }
        onPress={buy}
        loading={busy === 'buy'}
        disabled={!current || busy !== null}
        testID="paywall-buy"
      />
      {context === 'onboarding' ? (
        <Button
          label={t('paywall.continueFree')}
          variant="ghost"
          onPress={close}
          testID="paywall-continue-free"
        />
      ) : null}
      <Button
        label={t('paywall.restore')}
        variant="ghost"
        size="md"
        onPress={restore}
        loading={busy === 'restore'}
        testID="paywall-restore"
      />
      {purchasesAreMocked() ? <Banner tone="warning" message={t('paywall.sandboxNote')} /> : null}
      <LegalText i18nKey="paywall.legal" />
    </View>
  );
}

function PackageOption({
  pkg,
  selected,
  savings,
  onPress,
}: {
  pkg: PlanPackage;
  selected: boolean;
  savings: number | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${t(`paywall.plan.${pkg.kind}`)}, ${pkg.priceString}`}
      onPress={onPress}
      testID={`paywall-package-${pkg.kind}`}
      style={[
        styles.pkg,
        {
          borderColor: selected ? colors.primary : 'transparent',
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Icon
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        color={selected ? 'primary' : 'textSubtle'}
        size={22}
      />
      <View style={styles.flex}>
        <View style={styles.pkgTitle}>
          <AppText variant="bodyStrong">{t(`paywall.plan.${pkg.kind}`)}</AppText>
          {savings && savings > 0 ? (
            <View style={[styles.save, { backgroundColor: colors.accent }]}>
              <AppText variant="caption" style={{ color: palette.ink800 }}>
                {t('paywall.save', { percent: savings })}
              </AppText>
            </View>
          ) : null}
        </View>
        {pkg.trialDays ? (
          <AppText variant="caption" color="textMuted">
            {t('paywall.trialBadge', { days: pkg.trialDays })}
          </AppText>
        ) : null}
      </View>
      <View style={styles.price}>
        <AppText variant="bodyStrong">{pkg.priceString}</AppText>
        {pkg.kind === 'annual' && pkg.monthlyEquivalent ? (
          <AppText variant="caption" color="textMuted">
            {t('paywall.perMonth', { price: pkg.monthlyEquivalent })}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { gap: spacing.xs },
  crown: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefits: { gap: spacing.sm },
  benefit: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
  packages: { gap: spacing.md },
  pkg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1.5,
  },
  pkgTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  save: { paddingHorizontal: spacing.sm, borderRadius: radii.pill },
  price: { alignItems: 'flex-end' },
});
