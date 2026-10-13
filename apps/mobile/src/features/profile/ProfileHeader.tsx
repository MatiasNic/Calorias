import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components';
import { useStreak } from '@/features/habits/hooks';
import { useSessionStore } from '@/stores/session';
import { radii, spacing, useTheme } from '@/theme';

import { useProfile } from './hooks';

/** Avatar initial, display name and "plan · streak · email" line. */
export function ProfileHeader({ premium }: { premium: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSessionStore();
  const profile = useProfile();
  const streak = useStreak();
  const isGuest = session.status === 'guest';
  const name =
    profile.data?.display_name ||
    (isGuest
      ? session.demo
        ? t('profile.demo')
        : t('profile.guest')
      : (session.email?.split('@')[0] ?? t('profile.title')));

  return (
    <View style={styles.header}>
      <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
        <AppText variant="heading">{name.charAt(0).toUpperCase()}</AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {[
            premium
              ? t('common.premium')
              : `${t('profile.plan')} ${t('profile.free').toLowerCase()}`,
            streak.data?.current ? t('profile.streakShort', { count: streak.data.current }) : null,
            session.email,
          ]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
