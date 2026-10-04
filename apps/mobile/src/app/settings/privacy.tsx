import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  toast,
} from '@/components';
import { updateProfile } from '@/features/profile/hooks';
import { deleteMyAccount, exportMyData } from '@/services/account';
import { initAnalytics } from '@/services/analytics';
import { usePlan } from '@/services/purchases';
import { usePrefsStore } from '@/stores/prefs';
import { spacing } from '@/theme';

export default function Privacy() {
  const { t } = useTranslation();
  const prefs = usePrefsStore();
  const plan = usePlan();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const doExport = async (format: 'json' | 'csv') => {
    if (format === 'csv' && plan !== 'premium')
      return router.push({ pathname: '/paywall', params: { context: 'feature' } });
    setBusy(format);
    try {
      await exportMyData(format);
      toast.success(t('settings.exported'));
    } catch {
      toast.error(t('common.errorMessage'));
    } finally {
      setBusy(null);
    }
  };

  const doDelete = () =>
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          try {
            await deleteMyAccount();
            toast.success(t('settings.deleted'));
            router.replace('/welcome');
          } catch {
            toast.error(t('common.errorMessage'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  const consent = (key: 'analyticsConsent' | 'crashReportingConsent', label: string) => (
    <View style={styles.row}>
      <AppText style={styles.flex}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={!!prefs[key]}
        onValueChange={(v) => {
          prefs.set({ [key]: v });
          if (key === 'analyticsConsent') updateProfile({ analytics_consent: v });
          initAnalytics();
        }}
      />
    </View>
  );

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} keyboard>
      <ScreenHeader title={t('profile.privacy')} />
      <Card style={styles.card}>
        {consent('analyticsConsent', t('settings.analytics'))}
        {consent('crashReportingConsent', t('settings.crashes'))}
        <AppText variant="caption" color="textMuted">
          {t('onboarding.permissions.privacyNote')}
        </AppText>
      </Card>
      <SectionHeader title={t('export.title')} />
      <AppText color="textMuted">{t('settings.exportHint')}</AppText>
      <Card padded={false}>
        <ListRow
          icon="download"
          title={busy === 'json' ? t('export.preparing') : t('export.json')}
          onPress={() => doExport('json')}
          testID="export-json"
        />
        <ListRow
          icon="document-text"
          title={busy === 'csv' ? t('export.preparing') : t('export.csv')}
          value={plan === 'premium' ? undefined : t('common.premium')}
          onPress={() => doExport('csv')}
        />
      </Card>
      <SectionHeader title={t('settings.deleteAccount')} />
      <Banner tone="danger" message={t('settings.deleteHint')} />
      {confirmDelete ? (
        <Card style={styles.card}>
          <TextField
            label={t('settings.deleteConfirmLabel')}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            testID="delete-confirm-input"
          />
          <Button
            label={t('settings.deleteAccount')}
            variant="danger"
            loading={busy === 'delete'}
            disabled={confirmText.trim().toUpperCase() !== t('settings.deleteConfirmWord')}
            onPress={doDelete}
            testID="delete-confirm"
          />
        </Card>
      ) : (
        <Button
          label={t('settings.deleteAccount')}
          variant="outline"
          icon="trash"
          onPress={() => setConfirmDelete(true)}
          testID="delete-account"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
