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

const STEPS = ['split', 'recognize', 'portions', 'nutrients'] as const;
/** Steps advance on a timer; the last one keeps spinning until the answer arrives. */
const STEP_MS = 900;

function Spinner() {
  const { colors } = useTheme();
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.linear }), -1);
  }, [turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  return (
    <Animated.View
      style={[styles.spinner, { borderColor: colors.border, borderTopColor: colors.text }, style]}
    />
  );
}

/**
 * "Analizando…": what the user said (or the photo), four steps and placeholder rows.
 * Shared by voice, text and photo analysis.
 */
export function AnalyzingView({ quote, uri }: { quote?: string | null; uri?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), STEP_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      style={styles.wrap}
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('analyzing.title')}
    >
      {uri ? <Image source={{ uri }} style={styles.photo} contentFit="cover" /> : null}
      <View style={styles.head}>
        <AppText variant="title" style={styles.title}>
          {t('analyzing.title')}
        </AppText>
        {quote ? (
          <AppText color="textMuted" style={styles.quote}>
            «{quote}»
          </AppText>
        ) : null}
      </View>
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.step}>
            <View style={styles.mark}>
              {i < step ? (
                <Icon name="check_circle" color="text" size={22} />
              ) : i === step ? (
                <Spinner />
              ) : (
                <View style={[styles.pending, { borderColor: colors.border }]} />
              )}
            </View>
            <AppText variant="bodyStrong" color={i <= step ? 'text' : 'textSubtle'}>
              {t(`analyzing.steps.${s}`)}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.skeletons}>
        {[0, 1, 2].map((k) => (
          <View key={k} style={[styles.skeleton, { backgroundColor: colors.surface }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxl, paddingTop: spacing.xl, paddingHorizontal: spacing.xs },
  photo: { width: '100%', height: 180, borderRadius: radii.xxl },
  head: { gap: spacing.sm },
  title: { fontSize: 28, lineHeight: 32 },
  quote: { fontSize: 16, lineHeight: 23 },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 28 },
  mark: { width: 24, alignItems: 'center' },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5 },
  pending: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  skeletons: { gap: spacing.sm },
  skeleton: { height: 60, borderRadius: radii.lg, opacity: 0.6 },
});
