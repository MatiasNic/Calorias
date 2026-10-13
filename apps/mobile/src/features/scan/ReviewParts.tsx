import { normalizeText, type CookingMethod, type MealItem, type MealType } from '@bocado/shared';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components';
import { applyCookingMethod, isCookable } from '@/features/diary/cooking';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import type { CorrectionChange } from './correctionDiff';

/** Answers that are a cooking method ("Frita", "Al horno"…) are applied on the phone, no AI call. */
const ANSWER_METHODS: { re: RegExp; method: CookingMethod }[] = [
  { re: /horno|baked/, method: 'baked' },
  { re: /frit|fried/, method: 'fried' },
  { re: /plancha|parrilla|grill/, method: 'grilled' },
  { re: /hervid|boiled|cozid/, method: 'boiled' },
  { re: /crud|raw/, method: 'raw' },
];

export function methodForAnswer(answer: string): CookingMethod | null {
  const a = normalizeText(answer);
  return ANSWER_METHODS.find((m) => m.re.test(a))?.method ?? null;
}

/** The cookable item the question is about (named in it), or the only cookable one. */
export function questionTarget(question: string, items: readonly MealItem[]): number {
  const q = normalizeText(question);
  const cookable = items.map((item, index) => ({ item, index })).filter((x) => isCookable(x.item));
  const named = cookable.find(({ item }) =>
    normalizeText(item.display_name)
      .split(' ')
      .some((w) => w.length >= 4 && q.includes(w)),
  );
  return named?.index ?? (cookable.length === 1 ? cookable[0]!.index : -1);
}

/** How many kcal the answer can change (only when the answers are cooking methods). */
export function answerImpact(
  question: string,
  answers: readonly string[],
  items: readonly MealItem[],
) {
  const target = questionTarget(question, items);
  const methods = answers.map(methodForAnswer);
  if (target < 0 || methods.some((m) => !m)) return null;
  const kcals = methods.map((m) => applyCookingMethod(items[target]!, m!).nutrients.kcal);
  const delta = Math.round(Math.max(...kcals) - Math.min(...kcals));
  return delta >= 5 ? delta : null;
}

export function QuestionCard({
  question,
  answers,
  impact,
  onAnswer,
}: {
  question: string;
  answers: readonly string[];
  impact: number | null;
  onAnswer: (answer: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.question, { backgroundColor: colors.surface, borderColor: colors.text }]}>
      <View style={styles.qHead}>
        <AppText variant="subheading">{question}</AppText>
        {impact ? (
          <AppText variant="caption" color="textMuted">
            {t('review.impact', { kcal: impact })}
          </AppText>
        ) : null}
      </View>
      <View style={styles.answers}>
        {answers.map((a) => (
          <Pressable
            key={a}
            accessibilityRole="button"
            accessibilityLabel={a}
            onPress={() => onAnswer(a)}
            style={({ pressed }) => [
              styles.answer,
              { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <AppText variant="bodyStrong" numberOfLines={1}>
              {a}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function CorrectionSummary({
  text,
  changes,
  onUndo,
}: {
  text: string;
  changes: readonly CorrectionChange[];
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const describe = (c: CorrectionChange) =>
    c.kind === 'removed'
      ? t('review.changeRemoved')
      : c.kind === 'added'
        ? t('review.changeAdded')
        : c.kind === 'cooking'
          ? t(`cooking.${c.method ?? 'unknown'}`).toLowerCase()
          : `${Math.round(c.grams ?? 0)} g`;
  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      style={[styles.summary, { backgroundColor: colors.surface }]}
    >
      <View style={styles.understood}>
        <Icon name="record_voice_over" size={20} />
        <AppText variant="label" style={styles.flex}>
          {t('review.understood', { text })}
        </AppText>
      </View>
      {changes.map((c, i) => (
        <View key={i} style={styles.change}>
          <AppText variant="caption" color="textMuted" style={styles.flex} numberOfLines={1}>
            {c.name} → {describe(c)}
          </AppText>
          <AppText variant="caption" color="textMuted" tabular>
            {c.deltaKcal > 0 ? '+' : '−'}
            {formatKcal(Math.abs(c.deltaKcal))} kcal
          </AppText>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={onUndo}
        style={[styles.undo, { backgroundColor: colors.surfaceAlt }]}
      >
        <Icon name="undo" size={18} />
        <AppText variant="label">{t('review.undo')}</AppText>
      </Pressable>
    </Animated.View>
  );
}

export function GroupHeader({
  mealType,
  time,
  kcal,
  editing,
  onPress,
}: {
  mealType: MealType;
  time: { h: number; m: number };
  kcal: number;
  editing: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const label = t(`mealTypes.${mealType}`);
  const hhmm = `${String(time.h).padStart(2, '0')}:${String(time.m).padStart(2, '0')}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('review.changeWhen', { when: `${label} ${hhmm}` })}
      accessibilityState={{ expanded: editing }}
      onPress={onPress}
      style={styles.group}
    >
      <AppText variant="subheading">{label}</AppText>
      <AppText variant="caption" color="textMuted" tabular>
        {hhmm}
      </AppText>
      <Icon name="edit" size={16} color="textMuted" />
      <View style={styles.flex} />
      <AppText variant="caption" color="textMuted" tabular>
        {formatKcal(kcal)} kcal
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  question: { borderWidth: 1.5, borderRadius: radii.xxl, padding: spacing.lg, gap: 14 },
  qHead: { gap: 2 },
  answers: { flexDirection: 'row', gap: spacing.sm },
  answer: {
    flex: 1,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  summary: { borderRadius: radii.xxl, padding: spacing.lg, gap: spacing.sm },
  understood: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  change: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  kcalText: { fontFamily: fontFamily.bold },
});
