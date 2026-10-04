import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, EmptyState } from '@/components';
import { usePlan } from '@/services/purchases';

/** Renders children for premium users; otherwise an explanatory locked state with the paywall CTA. */
export function PremiumGate({
  children,
  title,
  message,
}: PropsWithChildren<{ title: string; message?: string }>) {
  const { t } = useTranslation();
  const plan = usePlan();
  if (plan === 'premium') return <>{children}</>;
  return (
    <Card>
      <EmptyState
        icon="lock-closed"
        title={title}
        message={message ?? t('errors.premiumRequired')}
        actionLabel={t('paywall.seePlans')}
        onAction={() => router.push({ pathname: '/paywall', params: { context: 'feature' } })}
      />
    </Card>
  );
}
