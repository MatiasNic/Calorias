import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { MEAL_ICONS } from '@/features/diary/mealIcons';
import { detectMeals } from '@/features/scan/detectMeals';
import { fontFamily, radii, spacing, useTheme } from '@/theme';

/** Live transcript (with a cursor while listening) and the meals it mentions. */
export function ListenTranscript({
  text,
  listening,
  large,
}: {
  text: string;
  listening: boolean;
  /** Full-screen style: bigger transcript. */
  large: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const meals = detectMeals(text);
  return (
    <View style={styles.body}>
      {text ? (
        <AppText style={[styles.transcript, large && styles.transcriptFull]}>
          {text}
          {listening ? <AppText style={[styles.cursor, { color: colors.text }]}>|</AppText> : null}
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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
});
