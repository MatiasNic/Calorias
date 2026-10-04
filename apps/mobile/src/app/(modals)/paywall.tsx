import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components';
import { PaywallContent, type PaywallContext } from '@/features/premium/PaywallContent';

export default function PaywallModal() {
  const { context = 'feature' } = useLocalSearchParams<{ context?: PaywallContext }>();
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <PaywallContent context={context} onClose={() => router.back()} />
    </Screen>
  );
}
