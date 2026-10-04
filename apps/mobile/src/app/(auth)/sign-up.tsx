import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  Screen,
  TextField,
} from '@/components';
import { LEGAL_VERSION } from '@/config/env';
import { LegalText } from '@/features/auth/LegalLinks';
import { SignUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { useAuthErrorMessage, type AuthMessageKey } from '@/features/auth/useAuthErrorMessage';
import { auth } from '@/services/auth';
import { useSessionStore } from '@/stores/session';
import { kv } from '@/stores/kv';
import { spacing } from '@/theme';

export default function SignUp() {
  const { t } = useTranslation();
  const errorMessage = useAuthErrorMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { name: '', email: '', password: '', accept: false as unknown as true },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      // Legal acceptance (date + version) is stored with the profile during onboarding.
      kv.set(
        'plato.termsAcceptedAt',
        JSON.stringify({ at: new Date().toISOString(), version: LEGAL_VERSION }),
      );
      useSessionStore.getState().acceptTerms();
      const { needsConfirmation } = await auth.signUpWithEmail(v.email, v.password, v.name);
      if (needsConfirmation) setSentTo(v.email);
      else router.replace('/');
    } catch (e) {
      setFormError(errorMessage(e));
    }
  });

  if (sentTo) {
    return (
      <Screen
        edges={['top', 'bottom', 'left', 'right']}
        footer={<Button label={t('auth.goToSignIn')} onPress={() => router.replace('/sign-in')} />}
      >
        <EmptyState
          icon="mail-unread"
          title={t('auth.checkEmailTitle')}
          message={t('auth.checkEmailMessage', { email: sentTo })}
        />
      </Screen>
    );
  }

  return (
    <Screen keyboard edges={['top', 'bottom', 'left', 'right']}>
      <IconButton
        icon="arrow-back"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
      />
      <AppText variant="title" accessibilityRole="header">
        {t('auth.signUpTitle')}
      </AppText>
      {formError ? <Banner tone="danger" message={formError} /> : null}
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label={t('auth.name')}
            autoComplete="name"
            textContentType="name"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error ? t(fieldState.error.message as AuthMessageKey) : null}
            testID="sign-up-email"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.password')}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            hint={t('auth.passwordHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error ? t(fieldState.error.message as AuthMessageKey) : null}
            testID="sign-up-password"
          />
        )}
      />
      <Controller
        control={control}
        name="accept"
        render={({ field, fieldState }) => (
          <View>
            <Checkbox
              checked={!!field.value}
              onChange={field.onChange}
              accessibilityLabel={t('auth.acceptTermsA11y')}
              testID="sign-up-accept"
            >
              <LegalText />
            </Checkbox>
            {fieldState.error ? (
              <AppText variant="caption" color="danger">
                {t('auth.errors.acceptTerms')}
              </AppText>
            ) : null}
          </View>
        )}
      />
      <Button
        label={t('auth.createAccount')}
        onPress={onSubmit}
        loading={formState.isSubmitting}
        testID="sign-up-submit"
      />
      <View style={styles.divider}>
        <AppText variant="caption" color="textMuted">
          {t('auth.or')}
        </AppText>
      </View>
      <SocialButtons />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { alignItems: 'center', paddingVertical: spacing.xs },
});
