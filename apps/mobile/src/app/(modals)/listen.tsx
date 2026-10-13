import type { IsoDate } from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, IconButton } from '@/components';
import { env } from '@/config/env';
import { MEAL_ICONS } from '@/features/diary/mealIcons';
import { detectMeals } from '@/features/scan/detectMeals';
import { useDictation } from '@/features/scan/useDictation';
import { VoiceWave } from '@/features/voice/VoiceWave';
import { currentLocale } from '@/i18n';
import { usePrefsStore } from '@/stores/prefs';
import { useUiStore } from '@/stores/ui';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { openTextAnalysis } from '@/features/scan/textRequest';
import { dateParam } from '@/utils/dates';

/** Demo mode without a speech engine (web, emulators): "dictates" the example word by word. */
const DEMO_WORD_MS = 240;

function Blink({ children, period }: { children: React.ReactNode; period: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: period / 2 }),
        withTiming(1, { duration: period / 2 }),
      ),
      -1,
    );
  }, [o, period]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function PulseRing() {
  const { colors } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }), -1);
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 * (1 - p.value),
    transform: [{ scale: 1 + 0.55 * p.value }],
  }));
  return <Animated.View style={[styles.ring, { borderColor: colors.text }, style]} />;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * "Escuchando": the user tells what they ate; the transcript and the meals it mentions appear
 * live. "Listo" analyzes it, "Escribir" moves to the keyboard, "De nuevo" starts over.
 * Opens as a sheet over Today or full screen (Perfil → Apariencia).
 */
export default function Listen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const full = usePrefsStore((s) => s.listenStyle) === 'full';
  const params = useLocalSearchParams<{ date?: IsoDate; text?: string }>();
  const [date] = useState<IsoDate>(
    () => dateParam(params.date) ?? useUiStore.getState().selectedDate,
  );
  // Coming back from the keyboard keeps what was written; new words are added after it.
  const [text, setText] = useState(params.text ?? '');
  const [seconds, setSeconds] = useState(0);
  const [demo, setDemo] = useState(false);
  const textRef = useRef('');
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  const dictation = useDictation(() => textRef.current, setText);
  const demoVolume = useSharedValue(0.7);
  const listening = dictation.listening || demo;

  const startDemo = () => {
    const words = t('listen.demoPhrase').split(' ');
    setText('');
    setDemo(true);
    words.forEach((_, i) =>
      setTimeout(() => setText(words.slice(0, i + 1).join(' ')), (i + 1) * DEMO_WORD_MS),
    );
    setTimeout(() => setDemo(false), (words.length + 1) * DEMO_WORD_MS);
  };

  const start = () => {
    setSeconds(0);
    // The web demo has no reliable speech engine: it plays the example instead.
    if (env.useMocks && (Platform.OS === 'web' || !dictation.available)) startDemo();
    else if (dictation.available) void dictation.start();
    else router.replace({ pathname: '/text-log', params: { date } });
  };

  useEffect(() => {
    // Starts the recognizer (or the demo); its state updates come from events and timers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [listening]);

  const stop = () => {
    if (dictation.listening) dictation.stop();
  };
  const cancel = () => {
    stop();
    router.back();
  };
  const write = () => {
    stop();
    router.replace({ pathname: '/text-log', params: { date, text: textRef.current } });
  };
  const again = () => {
    stop();
    dictation.reset();
    setText('');
    setTimeout(start, 150);
  };
  const done = () => {
    stop();
    const said = textRef.current.trim();
    if (said.length < 2) return write();
    haptic('success');
    openTextAnalysis({ text: said, source: 'voice', date });
  };

  const meals = detectMeals(text);
  const locale = currentLocale().replace('-', ' · ').toUpperCase();

  const content = (
    <>
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel={t('common.cancel')} onPress={cancel} />
        <View style={styles.status} accessibilityLiveRegion="polite">
          {listening ? (
            <Blink period={1200}>
              <View style={[styles.dot, { backgroundColor: colors.protein }]} />
            </Blink>
          ) : null}
          <AppText variant="bodyStrong">
            {listening ? t('listen.listening') : t('listen.paused')}
          </AppText>
          <AppText variant="bodyStrong" color="textSubtle" tabular>
            {fmt(seconds)}
          </AppText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
          <AppText variant="caption" style={styles.pillText}>
            {locale}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        {text ? (
          <AppText style={[styles.transcript, full && styles.transcriptFull]}>
            {text}
            {listening ? (
              <AppText style={[styles.cursor, { color: colors.text }]}>|</AppText>
            ) : null}
          </AppText>
        ) : (
          <AppText color="textSubtle" style={styles.placeholder}>
            {t('listen.placeholder')}
          </AppText>
        )}
        {meals.length ? (
          <View style={styles.meals}>
            {meals.map((m) => (
              <Animated.View
                key={m.mealType}
                entering={FadeInDown.duration(350)}
                style={[styles.meal, { backgroundColor: colors.surfaceAlt }]}
              >
                <Icon name={MEAL_ICONS[m.mealType]} size={18} color="textMuted" />
                <AppText variant="label" style={styles.mealName}>
                  {t(`mealTypes.${m.mealType}`)}
                </AppText>
                <AppText variant="label" color="textMuted" numberOfLines={1} style={styles.flex}>
                  {m.foods || '…'}
                </AppText>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </View>

      <AppText variant="caption" color="textSubtle" align="center" style={styles.hint}>
        {t('listen.hint')}
      </AppText>
      <VoiceWave active={listening} volume={demo ? demoVolume : dictation.volume} />

      <View style={styles.controls}>
        <View style={styles.control}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listen.write')}
            onPress={write}
            style={[styles.small, { backgroundColor: colors.surfaceAlt }]}
            testID="listen-write"
          >
            <Icon name="keyboard" size={26} />
          </Pressable>
          <AppText variant="caption" color="textMuted" style={styles.controlLabel}>
            {t('listen.write')}
          </AppText>
        </View>
        <View style={styles.control}>
          <View style={styles.doneWrap}>
            {listening ? <PulseRing /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('listen.done')}
              onPress={done}
              style={[styles.done, { backgroundColor: colors.primary }]}
              testID="listen-done"
            >
              <Icon name="check" size={34} color="onPrimary" />
            </Pressable>
          </View>
          <AppText variant="caption" color="textMuted" style={styles.controlLabel}>
            {t('listen.done')}
          </AppText>
        </View>
        <View style={styles.control}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listen.again')}
            onPress={again}
            style={[styles.small, { backgroundColor: colors.surfaceAlt }]}
            testID="listen-again"
          >
            <Icon name="restart_alt" size={26} />
          </Pressable>
          <AppText variant="caption" color="textMuted" style={styles.controlLabel}>
            {t('listen.again')}
          </AppText>
        </View>
      </View>
    </>
  );

  if (full) {
    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: colors.background }]}>
        {content}
      </SafeAreaView>
    );
  }
  return (
    <View style={styles.flex}>
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={cancel}
        />
      </Animated.View>
      <Animated.View
        entering={FadeInDown.duration(300)}
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        {content}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fullScreen: { flex: 1, justifyContent: 'space-between' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  status: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pill: {
    height: 32,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  pillText: { fontFamily: fontFamily.bold, fontSize: 12 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, minHeight: 150 },
  transcript: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 31, letterSpacing: -0.5 },
  transcriptFull: { fontSize: 30, lineHeight: 38, letterSpacing: -0.6 },
  cursor: { fontFamily: fontFamily.regular },
  placeholder: { fontSize: 15, lineHeight: 22 },
  meals: { gap: spacing.sm },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md + 2,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  mealName: { fontFamily: fontFamily.extrabold },
  hint: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  control: { alignItems: 'center', gap: spacing.xs, minWidth: 84 },
  controlLabel: { fontFamily: fontFamily.bold, fontSize: 12 },
  small: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  doneWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  done: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
  },
});
