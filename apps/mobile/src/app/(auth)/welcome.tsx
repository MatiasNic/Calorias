import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppLogo, AppText, Banner, Button, Icon, Screen, type IconName } from '@/components';
import { env } from '@/config/env';
import { features } from '@/config/features';
import { LegalText } from '@/features/auth/LegalLinks';
import { auth } from '@/services/auth';
import { radii, spacing, useTheme } from '@/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const points: { icon: IconName; text: string }[] = [
    { icon: 'photo_camera', text: t('welcome.point1') },
    { icon: 'record_voice_over', text: t('welcome.point2') },
    { icon: 'trending_up', text: t('welcome.point3') },
  ];

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <>
          {env.useMocks ? (
            <Banner
              tone="warning"
              icon="flask-outline"
              title={t('welcome.demoTitle')}
              message={t('welcome.demoMessage')}
            />
          ) : null}
          <Button
            label={t('welcome.createAccount')}
            onPress={() => router.push('/sign-up')}
            testID="welcome-sign-up"
          />
          <View style={styles.row}>
            <Button
              label={t('welcome.haveAccount')}
              variant="outline"
              size="md"
              style={styles.flex}
              onPress={() => router.push('/sign-in')}
              testID="welcome-sign-in"
            />
            {features.guestMode ? (
              <Button
                label={env.useMocks ? t('welcome.tryDemo') : t('welcome.tryGuest')}
                variant="secondary"
                size="md"
                style={styles.flex}
                onPress={async () => {
                  await auth.continueAsGuest();
                  router.replace('/');
                }}
                testID="welcome-guest"
              />
            ) : null}
          </View>
          <LegalText />
        </>
      }
    >
      <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
        <AppLogo size={52} />
        <AppText variant="display" style={styles.title}>
          {t('welcome.title')}
        </AppText>
        <AppText variant="body" color="textMuted">
          {t('welcome.subtitle')}
        </AppText>
      </Animated.View>
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={[styles.demo, { backgroundColor: colors.surface }]}
      >
        <View style={styles.demoQuote}>
          <View style={[styles.demoMic, { backgroundColor: colors.primary }]}>
            <Icon name="mic" size={22} color="onPrimary" />
          </View>
          <AppText variant="bodyStrong" style={styles.flex}>
            «{t('welcome.demoQuote')}»
          </AppText>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {(['demoBreakfast', 'demoDinner'] as const).map((k, i) => (
          <View key={k} style={styles.demoRow}>
            <AppText variant="label" color="textMuted" style={styles.flex} numberOfLines={1}>
              {t(`welcome.${k}`)}
            </AppText>
            <AppText variant="label" tabular>
              {i === 0 ? 411 : 413}
            </AppText>
          </View>
        ))}
      </Animated.View>
      <View style={styles.points}>
        {points.map((p, i) => (
          <Animated.View
            key={p.icon}
            entering={FadeInDown.delay(150 + i * 100)}
            style={styles.point}
          >
            <Icon name={p.icon} size={22} color="textMuted" />
            <AppText variant="label" style={styles.flex}>
              {p.text}
            </AppText>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.lg },
  demo: { borderRadius: 26, padding: spacing.lg, gap: spacing.md, marginTop: spacing.sm },
  demoQuote: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  demoMic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1 },
  demoRow: { flexDirection: 'row', gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  points: { gap: spacing.lg, marginTop: spacing.sm },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  title: { lineHeight: 38 },
});
