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
    { icon: 'camera-outline', text: t('welcome.point1') },
    { icon: 'create-outline', text: t('welcome.point2') },
    { icon: 'trending-up-outline', text: t('welcome.point3') },
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
        <AppText variant="display">{t('welcome.title')}</AppText>
        <AppText variant="body" color="textMuted">
          {t('welcome.subtitle')}
        </AppText>
      </Animated.View>
      <View style={styles.points}>
        {points.map((p, i) => (
          <Animated.View
            key={p.icon}
            entering={FadeInDown.delay(150 + i * 100)}
            style={styles.point}
          >
            <View style={[styles.pointIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={p.icon} size={20} color="text" />
            </View>
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
  hero: { alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.sm },
  points: { gap: spacing.md, marginTop: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
