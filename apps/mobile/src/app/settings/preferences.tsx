import type { AppLocale, UnitSystem } from '@plato/shared';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen, ScreenHeader, SectionHeader, SegmentedControl } from '@/components';
import { updateProfile } from '@/features/profile/hooks';
import { rescheduleReminders } from '@/features/settings/useNotificationSettings';
import { changeLocale, currentLocale } from '@/i18n';
import { usePrefsStore, type ThemePreference } from '@/stores/prefs';
import { spacing } from '@/theme';

export default function Preferences() {
  const { t } = useTranslation();
  const prefs = usePrefsStore();
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('profile.preferences')} />
      <SectionHeader title={t('settings.units')} />
      <SegmentedControl<UnitSystem>
        value={prefs.units}
        onChange={(units) => {
          prefs.set({ units });
          updateProfile({ unit_system: units });
        }}
        options={[
          { value: 'metric', label: t('settings.metric') },
          { value: 'imperial', label: t('settings.imperial') },
        ]}
      />
      <SectionHeader title={t('settings.language')} />
      <SegmentedControl<AppLocale>
        value={prefs.locale ?? currentLocale()}
        onChange={(locale) => {
          prefs.set({ locale });
          changeLocale(locale);
          updateProfile({ locale });
          // Scheduled reminders carry their text: re-create them in the new language.
          rescheduleReminders().catch(() => undefined);
        }}
        options={[
          { value: 'es-AR', label: 'Español' },
          { value: 'en-US', label: 'English' },
          { value: 'pt-BR', label: 'Português' },
        ]}
      />
      <SectionHeader title={t('settings.theme')} />
      <SegmentedControl<ThemePreference>
        value={prefs.theme}
        onChange={(theme) => prefs.set({ theme })}
        options={[
          { value: 'system', label: t('settings.themeSystem') },
          { value: 'light', label: t('settings.themeLight') },
          { value: 'dark', label: t('settings.themeDark') },
        ]}
      />
      <Card style={styles.card}>
        <View style={styles.row}>
          <AppText style={styles.flex}>{t('settings.haptics')}</AppText>
          <Switch
            accessibilityLabel={t('settings.haptics')}
            value={prefs.hapticsEnabled}
            onValueChange={(v) => prefs.set({ hapticsEnabled: v })}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText>{t('settings.savePhotos')}</AppText>
            <AppText variant="caption" color="textMuted">
              {t('settings.savePhotosHint')}
            </AppText>
          </View>
          <Switch
            accessibilityLabel={t('settings.savePhotos')}
            value={prefs.savePhotos}
            onValueChange={(v) => {
              prefs.set({ savePhotos: v });
              updateProfile({ save_photos: v });
            }}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
