import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card, ListRow, Screen, ScreenHeader } from '@/components';
import { env } from '@/config/env';

export default function About() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('profile.help')} />
      <Banner tone="info" title={t('settings.disclaimer')} message={t('common.disclaimer')} />
      <Card padded={false}>
        <ListRow
          icon="document-text"
          title={t('settings.terms')}
          onPress={() => WebBrowser.openBrowserAsync(env.termsUrl)}
        />
        <ListRow
          icon="lock-closed"
          title={t('settings.privacyPolicy')}
          onPress={() => WebBrowser.openBrowserAsync(env.privacyUrl)}
        />
        <ListRow
          icon="mail"
          title={t('settings.contact')}
          subtitle={env.supportEmail}
          onPress={() => Linking.openURL(`mailto:${env.supportEmail}`)}
        />
      </Card>
      <Card>
        <AppText variant="subheading">{t('settings.licenses')}</AppText>
        <AppText variant="caption" color="textMuted">
          {t('settings.licensesBody')}
        </AppText>
      </Card>
    </Screen>
  );
}
