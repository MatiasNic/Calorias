import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { AppText, Banner, Button, IconButton, Screen, TextField } from '@/components';
import { EmailSchema } from '@/features/auth/schemas';
import { useAuthErrorMessage, type AuthMessageKey } from '@/features/auth/useAuthErrorMessage';
import { auth } from '@/services/auth';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const errorMessage = useAuthErrorMessage();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof EmailSchema>>({
    resolver: zodResolver(EmailSchema),
    defaultValues: { email: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await auth.sendPasswordReset(v.email);
      setSent(true);
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
        {t('auth.resetTitle')}
      </AppText>
      <AppText color="textMuted">{t('auth.resetSubtitle')}</AppText>
      {sent ? <Banner tone="success" message={t('auth.resetSent')} /> : null}
      {formError ? <Banner tone="danger" message={formError} /> : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t(fieldState.error.message as AuthMessageKey) : null}
          />
        )}
      />
      <Button label={t('auth.sendResetLink')} onPress={onSubmit} loading={formState.isSubmitting} />
    </Screen>
  );
}
