import { router } from 'expo-router';
import { Image } from 'expo-image';
import { groupByMealType, MEAL_TYPE_ORDER, type MealType } from '@bocado/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, Screen } from '@/components';
import { DraftTotals } from '@/features/diary/DraftTotals';
import { useDraftStore } from '@/features/diary/draftStore';
import { applyCookingMethod } from '@/features/diary/cooking';
import {
  answerImpact,
  CorrectionSummary,
  methodForAnswer,
  QuestionCard,
  questionTarget,
} from '@/features/scan/ReviewParts';
import { HiddenExtras } from '@/features/scan/review/HiddenExtras';
import { MealGroupSection } from '@/features/scan/review/MealGroupSection';
import { mealOfItem, mealTimeOf } from '@/features/scan/review/mealGroups';
import { ReportMistake } from '@/features/scan/review/ReportMistake';
import { ReviewFooter } from '@/features/scan/review/ReviewFooter';
import { ReviewHeader } from '@/features/scan/review/ReviewHeader';
import { ReviewAnalyzing, ReviewFailure } from '@/features/scan/review/ReviewStatus';
import { useDiscardReview } from '@/features/scan/review/useDiscardReview';
import { useMealAnalysis } from '@/features/scan/review/useMealAnalysis';
import { useSaveReviewedMeal } from '@/features/scan/review/useSaveReviewedMeal';
import { useScanStore } from '@/features/scan/store';
import { useMealCorrection } from '@/features/scan/useMealCorrection';
import { env } from '@/config/env';
import { usePrefsStore } from '@/stores/prefs';
import { radii, spacing, useTheme } from '@/theme';

export default function ScanReview() {
  const { t } = useTranslation();
  const scan = useScanStore();
  const { colors } = useTheme();
  const { draft, patch, updateItem } = useDraftStore();
  const correction = useMealCorrection();
  const [groupEditing, setGroupEditing] = useState<MealType | null>(null);
  const savePhotos = usePrefsStore((s) => s.savePhotos);
  const { phase, error, notes, retry } = useMealAnalysis();
  const discard = useDiscardReview(phase);
  const { save, saving } = useSaveReviewedMeal();

  if (phase === 'analyzing') return <ReviewAnalyzing onClose={discard} />;

  if (phase === 'error' || phase === 'not_food') {
    return (
      <ReviewFailure kind={phase} error={error} notes={notes} onRetry={retry} onClose={discard} />
    );
  }

  if (!draft) return null;
  const indexed = draft.items.map((item, index) => ({ item, index }));
  const groups = groupByMealType(indexed, ({ item }) => mealOfItem(draft, item)).sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType),
  );
  const multiMeal = groups.length > 1;
  const question = draft.hiddenQuestion && draft.quickAnswers.length ? draft.hiddenQuestion : null;
  const impact = question ? answerImpact(question, draft.quickAnswers, draft.items) : null;
  const totalKcal = draft.items.reduce((s, i) => s + i.nutrients.kcal, 0);
  const now = new Date();
  const timeOf = (m: MealType) => mealTimeOf(draft, m, multiMeal, now);

  const answer = (a: string) => {
    if (!question || correction.busy) return;
    const method = methodForAnswer(a);
    const target = questionTarget(question, draft.items);
    // A cooking answer is applied right here (no AI call, no quota).
    if (method && target >= 0) {
      updateItem(target, {
        ...applyCookingMethod(draft.items[target]!, method),
        user_edited: true,
      });
      patch({ hiddenQuestion: null, quickAnswers: [] });
      return;
    }
    void correction.correct(`${question} ${a}`);
  };

  const setGroupMeal = (from: MealType, to: MealType) => {
    const itemMeals = { ...draft.itemMeals };
    for (const item of draft.items)
      if (item.id && mealOfItem(draft, item) === from) itemMeals[item.id] = to;
    patch({ itemMeals });
    setGroupEditing(to);
  };
  const setGroupTime = (m: MealType, time: { h: number; m: number }) =>
    multiMeal ? patch({ groupTimes: { ...draft.groupTimes, [m]: time } }) : patch({ time });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Screen edges={['top', 'left', 'right']} padded={false}>
        <ReviewHeader
          title={draft.dishName}
          date={draft.date}
          mealCount={groups.length}
          onClose={discard}
        />
        <View style={styles.content}>
          {scan.photo ? (
            <Image
              source={{ uri: scan.photo.uri }}
              style={styles.photo}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          {env.useMocks && scan.photo ? (
            <Banner
              tone="warning"
              icon="science"
              title={t('review.demoTitle')}
              message={t('review.demoMessage')}
            />
          ) : null}
          {question ? (
            <QuestionCard
              question={question}
              answers={draft.quickAnswers}
              impact={impact}
              onAnswer={answer}
            />
          ) : null}
          {draft.lastCorrection ? (
            <CorrectionSummary
              text={draft.lastCorrection.text}
              changes={draft.lastCorrection.changes}
              onUndo={correction.undo}
            />
          ) : null}
          <DraftTotals items={draft.items} />

          {groups.map((g) => {
            const editing = groupEditing === g.mealType;
            return (
              <MealGroupSection
                key={g.mealType}
                mealType={g.mealType}
                items={g.items}
                time={timeOf(g.mealType)}
                editing={editing}
                original={draft.original}
                onToggleEditing={() => setGroupEditing(editing ? null : g.mealType)}
                onChangeMealType={(m) =>
                  multiMeal
                    ? setGroupMeal(g.mealType, m)
                    : (patch({ mealType: m }), setGroupEditing(m))
                }
                onChangeTime={(time) => setGroupTime(g.mealType, time)}
              />
            );
          })}
          <Button
            label={t('review.addItem')}
            variant="ghost"
            size="md"
            icon="add"
            onPress={() => router.push({ pathname: '/food-search', params: { target: 'draft' } })}
            testID="review-add-item"
          />

          <HiddenExtras items={draft.items} />

          {draft.notes ? <Banner tone="info" message={draft.notes} /> : null}
          <AppText variant="caption" color="textSubtle">
            {t('review.estimatedNote')}
            {!savePhotos && scan.photo ? ` ${t('review.dontSavePhoto')}` : ''}
          </AppText>

          <ReportMistake draft={draft} />
        </View>
      </Screen>

      <ReviewFooter
        onCorrect={correction.correct}
        correcting={correction.busy}
        correctionError={correction.error}
        mealCount={groups.length}
        totalKcal={totalKcal}
        canSave={draft.items.length > 0}
        saving={saving}
        onSave={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: 14, paddingBottom: 200 },
  photo: { width: '100%', height: 140, borderRadius: radii.xxl },
});
