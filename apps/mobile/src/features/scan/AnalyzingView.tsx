import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { radii, spacing, useTheme } from '@/theme';

const STEPS = ['upload', 'detect', 'portions', 'nutrients'] as const;
const STEP_MS = 1800;

/** Loading screen with a scanning line over the photo and progress messages (target < 8 s). */
export function AnalyzingView({ uri }: { uri: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    const id = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), STEP_MS);
    return () => clearInterval(id);
  }, [y]);

  const line = useAnimatedStyle(() => ({ top: `${y.value * 100}%` }));

  return (
    <View
      style={styles.wrap}
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('scan.analyzing')}
    >
      {uri ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri }} style={styles.photo} contentFit="cover" />
          <Animated.View style={[styles.line, { backgroundColor: colors.kcal }, line]} />
        </View>
      ) : null}
      <AppText variant="heading" align="center">
        {t('scan.analyzing')}
      </AppText>
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.step}>
            <Icon
              name={i < step ? 'checkmark-circle' : i === step ? 'ellipse' : 'ellipse-outline'}
              color={i <= step ? 'primary' : 'textSubtle'}
              size={18}
            />
            <AppText color={i <= step ? 'text' : 'textMuted'}>{t(`scan.steps.${s}`)}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl, paddingTop: spacing.lg },
  photoWrap: { width: '100%', aspectRatio: 1, borderRadius: radii.xxl, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  line: { position: 'absolute', left: 0, right: 0, height: 3, opacity: 0.9 },
  steps: { gap: spacing.md, alignSelf: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
