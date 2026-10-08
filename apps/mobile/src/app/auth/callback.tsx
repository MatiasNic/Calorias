import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { toast } from '@/components';
import { i18next } from '@/i18n';
import { auth, AuthError } from '@/services/auth';

/** Deep link target for OAuth and email confirmation: bocado://auth/callback?code=… */
export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (!url) return;
    auth
      .handleAuthRedirect(url)
      .then(() => router.replace('/'))
      .catch((e) => {
        toast.error(
          i18next.t(
            e instanceof AuthError && e.code === 'provider_unavailable'
              ? 'auth.errors.providerUnavailable'
              : 'auth.errors.linkExpired',
          ),
        );
        router.replace('/sign-in');
      });
  }, [url]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
