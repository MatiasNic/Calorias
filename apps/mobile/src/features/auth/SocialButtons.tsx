import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, toast } from '@/components';
import { features } from '@/config/features';
import { auth, AuthError } from '@/services/auth';
import { radii, useTheme } from '@/theme';

export function SocialButtons() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  const run = async (kind: 'google' | 'apple') => {
    setBusy(kind);
    try {
      if (kind === 'google') await auth.signInWithGoogle();
      else await auth.signInWithApple();
    } catch (e) {
      if (!(e instanceof AuthError && e.code === 'cancelled')) toast.error(t('auth.errors.social'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {features.appleSignIn && Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            theme.dark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radii.lg}
          style={styles.apple}
          onPress={() => run('apple')}
        />
      ) : null}
      {features.googleSignIn ? (
        <Button
          label={t('auth.continueGoogle')}
          icon="logo-google"
          variant="outline"
          loading={busy === 'google'}
          onPress={() => run('google')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  apple: { height: 56, width: '100%' },
});
