import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppLogo, AppText, Banner, Button, IconButton } from '@/components';
import { LegalText } from '@/features/auth/LegalLinks';
import { purchasesAreMocked } from '@/services/purchases';
import { spacing, useTheme } from '@/theme';

import { PackageOption } from './PackageOption';
import { PaywallBenefits } from './PaywallBenefits';
import { type PaywallContext, usePaywall } from './usePaywall';

export type { PaywallContext } from './usePaywall';

export function PaywallContent({
  context,
  onClose,
}: {
  context: PaywallContext;
  onClose: (purchased: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { packages, list, current, savings, select, busy, buy, restore, close } = usePaywall(
    context,
    onClose,
  );

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

      <PaywallBenefits />

      {packages.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {packages.isError ? <Banner tone="danger" message={t('paywall.loadError')} /> : null}

      <View style={styles.packages} accessibilityRole="radiogroup">
        {list.map((p) => (
          <PackageOption
            key={p.id}
            pkg={p}
            selected={current?.id === p.id}
            savings={p.kind === 'annual' ? savings : null}
            onPress={() => select(p.id)}
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hero: { gap: spacing.xs },
  packages: { gap: spacing.md },
});
