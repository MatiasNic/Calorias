import { useCameraPermissions } from 'expo-camera';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, type IconName, Toggle } from '@/components';
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
      <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name={icon} color="text" />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {body}
        </AppText>
      </View>
      {granted ? (
        <View
          style={[styles.granted, { backgroundColor: colors.primary }]}
          accessibilityLabel={t('onboarding.permissions.granted')}
        >
          <Icon name="check" color="onPrimary" size={20} />
        </View>
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
  const [mic, setMic] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [health, setHealth] = useState(false);
  const prefs = usePrefsStore();

  return (
    <StepScaffold
      title={t('onboarding.permissions.title')}
      subtitle={t('onboarding.permissions.subtitle')}
    >
      {features.voiceLogging ? (
        <PermissionRow
          icon="mic"
          title={t('onboarding.permissions.mic')}
          body={t('onboarding.permissions.micBody')}
          granted={mic}
          onRequest={async () => {
            try {
              const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
              setMic(res.granted);
            } catch {
              setMic(false);
            }
          }}
        />
      ) : null}
      <PermissionRow
        icon="photo_camera"
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
          <Toggle
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
          <Toggle
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
  granted: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  consent: { gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
