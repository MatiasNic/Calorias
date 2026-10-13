import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components';
import { ListenControls } from '@/features/voice/ListenControls';
import { ListenHeader } from '@/features/voice/ListenHeader';
import { ListenTranscript } from '@/features/voice/ListenTranscript';
import { useListenSession } from '@/features/voice/useListenSession';
import { VoiceWave } from '@/features/voice/VoiceWave';
import { usePrefsStore } from '@/stores/prefs';
import { overlay, radii, spacing, useTheme } from '@/theme';

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
  const session = useListenSession();

  const content = (
    <>
      <ListenHeader
        listening={session.listening}
        seconds={session.seconds}
        onCancel={session.cancel}
      />
      <ListenTranscript text={session.text} listening={session.listening} large={full} />
      <AppText variant="caption" color="textSubtle" align="center" style={styles.hint}>
        {t('listen.hint')}
      </AppText>
      <VoiceWave active={session.listening} volume={session.volume} />
      <ListenControls
        listening={session.listening}
        onWrite={session.write}
        onDone={session.done}
        onAgain={session.again}
      />
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
          onPress={session.cancel}
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
    shadowColor: overlay.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.xs },
  hint: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
});
