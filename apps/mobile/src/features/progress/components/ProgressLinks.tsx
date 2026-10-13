import type { Plan } from '@bocado/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card, ListRow } from '@/components';

/** Links to the weekly summary, achievements and the premium analyses. */
export function ProgressLinks({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  return (
    <Card padded={false}>
      <ListRow
        icon="calendar"
        title={t('progress.weeklySummary')}
        onPress={() => router.push('/weekly-summary')}
      />
      <ListRow
        icon="trophy"
        title={t('progress.achievements')}
        onPress={() => router.push('/achievements')}
      />
      <ListRow
        icon="analytics"
        title={t('progress.adaptiveTitle')}
        value={plan === 'premium' ? undefined : t('common.premium')}
        onPress={() => router.push('/adaptive')}
      />
      <ListRow
        icon="nutrition"
        title={t('micros.title')}
        value={plan === 'premium' ? undefined : t('common.premium')}
        onPress={() => router.push('/micros')}
      />
    </Card>
  );
}
