import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppLogo, AppText, Banner, Button, Icon, Screen, type IconName } from '@/components';
import { env } from '@/config/env';
import { features } from '@/config/features';
import { LegalText } from '@/features/auth/LegalLinks';
import { auth } from '@/services/auth';
import { spacing, useTheme } from '@/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const points: { icon: IconName; text: string }[] = [
    { icon: 'camera', text: t('welcome.point1') },
    { icon: 'create', text: t('welcome.point2') },
    { icon: 'trending-up', text: t('welcome.point3') },
  ];

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      footer={
        <>
          <Button
            label={t('welcome.createAccount')}
            onPress={() => router.push('/sign-up')}
            testID="welcome-sign-up"
          />
          <Button
            label={t('welcome.haveAccount')}
            variant="ghost"
            onPress={() => router.push('/sign-in')}
            testID="welcome-sign-in"
          />
          {features.guestMode ? (
            <Button
              label={env.useMocks ? t('welcome.tryDemo') : t('welcome.tryGuest')}
              variant="outline"
              onPress={() => auth.continueAsGuest()}
              testID="welcome-guest"
            />
          ) : null}
          <LegalText />
        </>
      }
    >
      <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
        <AppLogo size={88} />
        <AppText variant="display" align="center">
          {t('welcome.title')}
        </AppText>
        <AppText variant="body" color="textMuted" align="center">
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
            <View style={[styles.pointIcon, { backgroundColor: colors.primarySoft }]}>
              <Icon name={p.icon} color="primary" />
            </View>
            <AppText variant="body" style={styles.flex}>
              {p.text}
            </AppText>
          </Animated.View>
        ))}
      </View>
      {env.useMocks ? (
        <Banner tone="warning" title={t('welcome.demoTitle')} message={t('welcome.demoMessage')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  points: { gap: spacing.md, marginTop: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
