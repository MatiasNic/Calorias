import { useTranslation } from 'react-i18next';

import { AppText, Screen } from '@/components';

export default function Placeholder() {
  const { t } = useTranslation();
  return (
    <Screen>
      <AppText variant="title">{t('tabs.profile')}</AppText>
      <AppText color="textMuted">{t('common.comingSoon')}</AppText>
    </Screen>
  );
}
