import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { AppText, Button, Screen, TextField, toast } from '@/components';
import { NewPasswordSchema } from '@/features/auth/schemas';
import type { AuthMessageKey } from '@/features/auth/useAuthErrorMessage';
import { auth } from '@/services/auth';

export default function ResetPassword() {
  const { t } = useTranslation();
  const url = Linking.useLinkingURL();
  useEffect(() => {
    if (url) auth.handleAuthRedirect(url).catch(() => undefined);
  }, [url]);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { password: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await auth.updatePassword(v.password);
      toast.success(t('auth.passwordUpdated'));
      router.replace('/');
    } catch {
      toast.error(t('common.errorMessage'));
    }
  });
  return (
    <Screen keyboard edges={['top', 'bottom', 'left', 'right']}>
      <AppText variant="title">{t('auth.newPasswordTitle')}</AppText>
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label={t('auth.password')}
            secureTextEntry
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error ? t(fieldState.error.message as AuthMessageKey) : null}
          />
        )}
      />
      <Button label={t('common.save')} onPress={onSubmit} loading={formState.isSubmitting} />
    </Screen>
  );
}
