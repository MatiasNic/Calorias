import * as WebBrowser from 'expo-web-browser';
import { Trans } from 'react-i18next';

import { AppText } from '@/components';
import { env } from '@/config/env';

export function LegalText({
  i18nKey = 'auth.legal',
}: {
  i18nKey?: 'auth.legal' | 'paywall.legal';
}) {
  return (
    <AppText variant="caption" color="textMuted" align="center">
      <Trans
        i18nKey={i18nKey}
        components={{
          terms: (
            <AppText
              variant="caption"
              color="primary"
              accessibilityRole="link"
              onPress={() => WebBrowser.openBrowserAsync(env.termsUrl)}
            />
          ),
          privacy: (
            <AppText
              variant="caption"
              color="primary"
              accessibilityRole="link"
              onPress={() => WebBrowser.openBrowserAsync(env.privacyUrl)}
            />
          ),
        }}
      />
    </AppText>
  );
}
