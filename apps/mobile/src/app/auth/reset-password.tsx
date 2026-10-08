import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { AppText, Button, Screen, TextField, toast } from '@/components';
import { NewPasswordSchema } from '@/features/auth/schemas';
import { useAuthErrorMessage, type AuthMessageKey } from '@/features/auth/useAuthErrorMessage';
import { auth } from '@/services/auth';

export default function ResetPassword() {
  const { t } = useTranslation();
  const url = Linking.useLinkingURL();
  const authError = useAuthErrorMessage();
  // Recovery links work once: opening one twice (or on a computer first) leaves no session.
  const [linkFailed, setLinkFailed] = useState(false);
  useEffect(() => {
    if (!url) return;
    auth.handleAuthRedirect(url).catch(() => {
      setLinkFailed(true);
      toast.error(t('auth.errors.linkExpired'));
    });
  }, [url, t]);
  const { control, handleSubmit, formState } = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { password: '' },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await auth.updatePassword(v.password);
      toast.success(t('auth.passwordUpdated'));
      router.replace('/');
    } catch (e) {
      toast.error(linkFailed ? t('auth.errors.linkExpired') : authError(e));
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
      {linkFailed ? <AppText color="danger">{t('auth.resetLinkHint')}</AppText> : null}
      <Button label={t('common.save')} onPress={onSubmit} loading={formState.isSubmitting} />
      {linkFailed ? (
        <Button
          label={t('auth.requestNewLink')}
          variant="outline"
          onPress={() => router.replace('/forgot-password')}
        />
      ) : null}
    </Screen>
  );
}
