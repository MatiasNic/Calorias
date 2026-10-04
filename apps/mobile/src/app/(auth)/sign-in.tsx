import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, IconButton, Screen, TextField } from '@/components';
import { SignInSchema, type SignInValues } from '@/features/auth/schemas';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { useAuthErrorMessage, type AuthMessageKey } from '@/features/auth/useAuthErrorMessage';
import { auth } from '@/services/auth';
import { spacing } from '@/theme';

export default function SignIn() {
  const { t } = useTranslation();
  const errorMessage = useAuthErrorMessage();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await auth.signInWithEmail(v.email, v.password);
      router.replace('/');
    } catch (e) {
      setFormError(errorMessage(e));
    }
  });

  return (
    <Screen keyboard edges={['top', 'bottom', 'left', 'right']}>
      <IconButton
        icon="arrow-back"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
      />
      <AppText variant="title" accessibilityRole="header">
        {t('auth.signInTitle')}
      </AppText>
      {formError ? <Banner tone="danger" message={formError} /> : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error ? t(fieldState.error.message as AuthMessageKey) : null}
            testID="sign-in-email"
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
            autoComplete="current-password"
            textContentType="password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={onSubmit}
            error={fieldState.error ? t(fieldState.error.message as AuthMessageKey) : null}
            testID="sign-in-password"
          />
        )}
      />
      <Button
        label={t('auth.signIn')}
        onPress={onSubmit}
        loading={formState.isSubmitting}
        testID="sign-in-submit"
      />
      <Button
        label={t('auth.forgotPassword')}
        variant="ghost"
        size="md"
        onPress={() => router.push('/forgot-password')}
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
