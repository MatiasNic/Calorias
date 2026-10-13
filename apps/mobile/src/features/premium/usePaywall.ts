import { annualSavingsPercent } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { captureError, track } from '@/services/analytics';
import { getPackages, purchase, restorePurchases } from '@/services/purchases';
import { haptic } from '@/utils/haptics';

export type PaywallContext = 'onboarding' | 'quota' | 'feature' | 'settings';

/**
 * Paywall state: available packages (annual preselected), purchase and restore flows, and the
 * analytics events for viewed / purchased / dismissed.
 */
export function usePaywall(context: PaywallContext, onClose: (purchased: boolean) => void) {
  const { t } = useTranslation();
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
  const savings = annual && monthly ? annualSavingsPercent(annual.price, monthly.price) : null;

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
    } catch (e) {
      captureError(e, { where: 'restorePurchases' });
      toast.error(t('common.errorMessage'));
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    track('paywall_dismissed', { context });
    onClose(false);
  };

  return {
    packages,
    list,
    current,
    savings,
    select: setSelected,
    busy,
    buy,
    restore,
    close,
  };
}
