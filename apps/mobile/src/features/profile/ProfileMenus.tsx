import { router } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, Icon, ListRow, SectionHeader, toast } from '@/components';
import { features } from '@/config/features';
import { logWeight } from '@/features/body/hooks';
import { isHealthSupported, readLatestWeightKg, requestHealthPermissions } from '@/services/health';
import { usePrefsStore } from '@/stores/prefs';
import { useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';

/** Goals, achievements, recipes, training and supplements. */
export function GoalsMenu() {
  const { t } = useTranslation();
  return (
    <>
      <SectionHeader title={t('profile.goals')} />
      <Card padded={false}>
        <ListRow
          icon="flag-outline"
          title={t('goals.editTitle')}
          onPress={() => router.push('/goals')}
        />
        <ListRow
          icon="trophy-outline"
          title={t('profile.achievements')}
          onPress={() => router.push('/achievements')}
        />
        <ListRow
          icon="book-outline"
          title={t('profile.recipes')}
          onPress={() => router.push('/recipes')}
        />
        <ListRow
          icon="barbell-outline"
          title={t('profile.training')}
          onPress={() => router.push('/training')}
        />
        <ListRow
          icon="medkit-outline"
          title={t('profile.supplements')}
          onPress={() => router.push('/supplements')}
        />
      </Card>
    </>
  );
}

function PremiumRow({
  title,
  icon,
  href,
  premium,
}: {
  title: string;
  icon: Parameters<typeof ListRow>[0]['icon'];
  href: string;
  premium: boolean;
}) {
  return (
    <ListRow
      icon={icon}
      title={title}
      chevron={premium}
      right={premium ? undefined : <Icon name="lock-closed-outline" size={18} color="textSubtle" />}
      onPress={() => router.push(href as never)}
    />
  );
}

/** Premium features (locked on free) and the health-app connection. */
export function PremiumMenu({ premium }: { premium: boolean }) {
  const { t } = useTranslation();

  const connectHealth = async () => {
    if (!premium) return router.push({ pathname: '/paywall', params: { context: 'feature' } });
    if (await requestHealthPermissions()) {
      const w = await readLatestWeightKg();
      if (w) await logWeight(todayLocal(), w.kg, 'health');
      toast.success(t('common.done'));
    }
  };

  return (
    <>
      <SectionHeader title={t('common.premium')} />
      <Card padded={false}>
        <PremiumRow
          title={t('profile.coach')}
          icon="chatbubbles-outline"
          href="/coach"
          premium={premium}
        />
        <PremiumRow
          title={t('profile.mealPlan')}
          icon="calendar-outline"
          href="/meal-plan"
          premium={premium}
        />
        <PremiumRow
          title={t('profile.adaptive')}
          icon="pulse-outline"
          href="/adaptive"
          premium={premium}
        />
        <PremiumRow
          title={t('profile.micros')}
          icon="nutrition-outline"
          href="/micros"
          premium={premium}
        />
        {features.healthSync && isHealthSupported() ? (
          <ListRow
            icon="heart-outline"
            title={t('profile.healthSync')}
            value={premium ? undefined : t('common.premium')}
            onPress={connectHealth}
          />
        ) : null}
      </Card>
    </>
  );
}

/** Reminders, theme (cycles system → dark → light), widgets, preferences, privacy and help. */
export function SettingsMenu() {
  const { t } = useTranslation();
  const theme = useTheme();
  const prefs = usePrefsStore();
  return (
    <>
      <SectionHeader title={t('settings.title')} />
      <Card padded={false}>
        <ListRow
          icon="notifications-outline"
          title={t('profile.reminders')}
          onPress={() => router.push('/settings/reminders')}
        />
        <ListRow
          icon={theme.dark ? 'dark_mode' : 'light_mode'}
          title={t('settings.theme')}
          value={t(
            prefs.theme === 'dark'
              ? 'settings.themeDark'
              : prefs.theme === 'light'
                ? 'settings.themeLight'
                : 'settings.themeSystem',
          )}
          onPress={() =>
            prefs.set({
              theme:
                prefs.theme === 'system' ? 'dark' : prefs.theme === 'dark' ? 'light' : 'system',
            })
          }
          testID="profile-theme"
        />
        {Platform.OS === 'android' ? (
          <ListRow
            icon="widgets"
            title={t('widgets.title')}
            onPress={() => router.push('/settings/widgets')}
            testID="profile-widgets"
          />
        ) : null}
        <ListRow
          icon="options-outline"
          title={t('profile.preferences')}
          onPress={() => router.push('/settings/preferences')}
        />
        <ListRow
          icon="shield-checkmark-outline"
          title={t('profile.privacy')}
          onPress={() => router.push('/settings/privacy')}
          testID="profile-privacy"
        />
        <ListRow
          icon="help-buoy-outline"
          title={t('profile.help')}
          onPress={() => router.push('/settings/about')}
        />
      </Card>
    </>
  );
}
