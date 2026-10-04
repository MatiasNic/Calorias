import { useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, type IconName } from '@/components';
import { features } from '@/config/features';
import { initAnalytics } from '@/services/analytics';
import { requestHealthPermissions } from '@/services/health';
import { requestNotificationPermission } from '@/services/notifications';
import { usePrefsStore } from '@/stores/prefs';
import { spacing, useTheme } from '@/theme';
import { StepScaffold } from './StepScaffold';

function PermissionRow({
  icon,
  title,
  body,
  granted,
  onRequest,
}: {
  icon: IconName;
  title: string;
  body: string;
  granted: boolean;
  onRequest: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} color="primary" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {body}
        </AppText>
      </View>
      {granted ? (
        <Icon name="checkmark-circle" color="success" size={28} />
      ) : (
        <Button
          label={t('onboarding.permissions.allow')}
          size="sm"
          fullWidth={false}
          variant="secondary"
          onPress={onRequest}
        />
      )}
    </Card>
  );
}

export function PermissionsStep() {
  const { t } = useTranslation();
  const [camera, requestCamera] = useCameraPermissions();
  const [notifications, setNotifications] = useState(false);
  const [health, setHealth] = useState(false);
  const prefs = usePrefsStore();

  return (
    <StepScaffold
      title={t('onboarding.permissions.title')}
      subtitle={t('onboarding.permissions.subtitle')}
    >
      <PermissionRow
        icon="camera"
        title={t('onboarding.permissions.camera')}
        body={t('onboarding.permissions.cameraBody')}
        granted={!!camera?.granted}
        onRequest={() => requestCamera()}
      />
      <PermissionRow
        icon="notifications"
        title={t('onboarding.permissions.notifications')}
        body={t('onboarding.permissions.notificationsBody')}
        granted={notifications}
        onRequest={async () => setNotifications(await requestNotificationPermission())}
      />
      {features.healthSync ? (
        <PermissionRow
          icon="heart"
          title={t('onboarding.permissions.health')}
          body={t('onboarding.permissions.healthBody')}
          granted={health}
          onRequest={async () => setHealth(await requestHealthPermissions())}
        />
      ) : null}
      <AppText variant="subheading">{t('onboarding.permissions.privacyTitle')}</AppText>
      <Card style={styles.consent}>
        <View style={styles.switchRow}>
          <AppText style={styles.flex}>{t('onboarding.permissions.analytics')}</AppText>
          <Switch
            accessibilityLabel={t('onboarding.permissions.analytics')}
            value={!!prefs.analyticsConsent}
            onValueChange={(v) => {
              prefs.set({ analyticsConsent: v });
              initAnalytics();
            }}
          />
        </View>
        <View style={styles.switchRow}>
          <AppText style={styles.flex}>{t('onboarding.permissions.crashes')}</AppText>
          <Switch
            accessibilityLabel={t('onboarding.permissions.crashes')}
            value={!!prefs.crashReportingConsent}
            onValueChange={(v) => {
              prefs.set({ crashReportingConsent: v });
              initAnalytics();
            }}
          />
        </View>
        <AppText variant="caption" color="textMuted">
          {t('onboarding.permissions.privacyNote')}
        </AppText>
      </Card>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  consent: { gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
