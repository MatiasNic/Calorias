import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  groupByMealType,
  MEAL_TYPE_ORDER,
  timeForMealType,
  type MealItem,
  type MealType,
} from '@plato/shared';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  Screen,
  TextField,
  toast,
} from '@/components';
import { DraftItemCard } from '@/features/diary/DraftItemCard';
import { DraftTotals } from '@/features/diary/DraftTotals';
import { useDraftStore } from '@/features/diary/draftStore';
import { applyCookingMethod, HIDDEN_EXTRAS } from '@/features/diary/cooking';
import { saveMeal } from '@/features/diary/hooks';
import { makeItem } from '@/features/diary/mealMath';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { getRegionalFood } from '@/features/foods/search';
import { checkAchievements } from '@/features/habits/hooks';
import { AnalyzingView } from '@/features/scan/AnalyzingView';
import { CorrectionBar } from '@/features/scan/CorrectionBar';
import {
  answerImpact,
  CorrectionSummary,
  GroupHeader,
  methodForAnswer,
  QuestionCard,
  questionTarget,
} from '@/features/scan/ReviewParts';
import { useScanStore } from '@/features/scan/store';
import { draftFromAnalysis } from '@/features/scan/toDraft';
import { useAiError } from '@/features/scan/useAiError';
import { useMealCorrection } from '@/features/scan/useMealCorrection';
import { env } from '@/config/env';
import { analyzeMealPhoto, reportAiMistake } from '@/services/ai';
import { track } from '@/services/analytics';
import { prepareMealImage, persistLocalPhoto } from '@/services/image';
import { cancelMealReminderToday } from '@/services/notifications';
import { usePlan } from '@/services/purchases';
import { queryClient } from '@/services/queryClient';
import { usePrefsStore } from '@/stores/prefs';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay, timestampFor, todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';
import { haptic } from '@/utils/haptics';

type Phase = 'analyzing' | 'review' | 'not_food' | 'error';

export default function ScanReview() {
  const { t } = useTranslation();
  const scan = useScanStore();
  const { colors } = useTheme();
  const { draft, start, patch, addItem, removeItem, updateItem, clear } = useDraftStore();
  const correction = useMealCorrection();
  const insets = useSafeAreaInsets();
  const [groupEditing, setGroupEditing] = useState<MealType | null>(null);
  const savePhotos = usePrefsStore((s) => s.savePhotos);
  const plan = usePlan();
  const aiError = useAiError();
  const [phase, setPhase] = useState<Phase>(
    scan.result ? (scan.result.is_food ? 'review' : 'not_food') : 'analyzing',
  );
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(scan.result?.notes ?? null);
  const [reporting, setReporting] = useState(false);
  const [report, setReport] = useState('');
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  const analyze = async () => {
    const photo = scan.photo;
    if (!photo) return;
    const t0 = Date.now();
    try {
      const img = await prepareMealImage(
        photo.uri,
        photo.width,
        photo.height,
        plan === 'premium' && savePhotos,
      );
      const { result, photoPath } = await analyzeMealPhoto(
        img,
        scan.mealType ?? undefined,
        scan.hint ?? undefined,
      );
      track('scan_completed', {
        ms: Date.now() - t0,
        items: result.items.length,
        cached: result.cached,
      });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      if (!result.is_food) {
        setNotes(result.notes);
        setPhase('not_food');
        return;
      }
      start(
        draftFromAnalysis(result, {
          source: 'photo',
          mealType: scan.mealType,
          date: scan.date,
          photoPath,
          localPhotoUri: savePhotos ? img.uri : null,
        }),
      );
      setPhase('review');
    } catch (e) {
      track('scan_failed');
      setError(aiError(e));
      setPhase('error');
    }
  };

  const retry = () => {
    setPhase('analyzing');
    setError(null);
    void analyze();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (scan.result) {
      start(draftFromAnalysis(scan.result, { source: scan.source, date: scan.date }));
    } else {
      // State updates happen after awaits (async analysis), not synchronously in the effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const discard = () => {
    const leave = () => {
      clear();
      scan.clear();
      router.back();
    };
    if (phase !== 'review') return leave();
    Alert.alert(t('review.discardTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('review.discard'), style: 'destructive', onPress: leave },
    ]);
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      discard();
      return true;
    });
    return () => sub.remove();
  });

  const mealOf = (item: MealItem): MealType =>
    (item.id ? draft?.itemMeals[item.id] : undefined) ?? draft?.mealType ?? 'other';

  const save = async () => {
    if (!draft || !draft.items.length) return;
    setSaving(true);
    try {
      const localUri = draft.localPhotoUri
        ? persistLocalPhoto(draft.localPhotoUri, `${Date.now()}`)
        : null;
      const groups = groupByMealType(draft.items, mealOf);
      const now = new Date();
      for (const [i, group] of groups.entries()) {
        // One description with several meals → one meal each, at its usual time.
        const time =
          groups.length > 1
            ? (draft.groupTimes[group.mealType] ?? timeForMealType(group.mealType, now))
            : draft.time;
        await saveMeal({
          date: draft.date,
          eatenAt: timestampFor(draft.date, time),
          mealType: group.mealType,
          source: draft.source,
          items: group.items,
          photoPath: i === 0 ? draft.photoPath : null,
          localPhotoUri: i === 0 ? localUri : null,
          aiScanId: draft.aiScanId,
        });
        cancelMealReminderToday(group.mealType).catch(() => undefined);
      }
      haptic('success');
      track('meal_saved', {
        source: draft.source,
        items: draft.items.length,
        meals: groups.length,
      });
      checkAchievements().catch(() => undefined);
      toast.success(
        groups.length > 1 ? t('review.savedMany', { count: groups.length }) : t('review.saved'),
      );
      clear();
      scan.clear();
      router.dismissTo('/today');
    } catch {
      toast.error(t('common.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  const sendReport = async () => {
    if (!draft) return;
    await reportAiMistake(draft.aiScanId, draft.original, draft.items, report).catch(
      () => undefined,
    );
    setReporting(false);
    setReport('');
    toast.success(t('review.reportSent'));
  };

  if (phase === 'analyzing') {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={discard} />
        <AnalyzingView uri={scan.photo?.uri ?? null} />
      </Screen>
    );
  }

  if (phase === 'error' || phase === 'not_food') {
    return (
      <Screen
        edges={['top', 'bottom', 'left', 'right']}
        footer={
          <>
            {phase === 'error' && scan.photo ? (
              <Button label={t('common.retry')} icon="refresh" onPress={retry} />
            ) : null}
            {scan.source === 'photo' ? (
              <Button
                label={t('review.retake')}
                variant="outline"
                icon="camera"
                onPress={() => router.replace('/scan')}
              />
            ) : (
              <Button
                label={t('review.editText')}
                variant="outline"
                icon="create-outline"
                onPress={() =>
                  router.replace({
                    pathname: '/text-log',
                    params: {
                      text: scan.inputText ?? '',
                      ...(scan.date ? { date: scan.date } : {}),
                    },
                  })
                }
              />
            )}
            <Button
              label={t('review.manual')}
              variant="ghost"
              onPress={() => router.replace('/food-search')}
            />
          </>
        }
      >
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={discard} />
        {phase === 'not_food' ? (
          <EmptyState
            icon="help-circle"
            title={t('review.notFoodTitle')}
            message={notes ?? t('review.notFoodBody')}
          />
        ) : (
          <ErrorState message={error ?? undefined} />
        )}
      </Screen>
    );
  }

  if (!draft) return null;
  const indexed = draft.items.map((item, index) => ({ item, index }));
  const groups = groupByMealType(indexed, ({ item }) => mealOf(item)).sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType),
  );
  const multiMeal = groups.length > 1;
  const question = draft.hiddenQuestion && draft.quickAnswers.length ? draft.hiddenQuestion : null;
  const impact = question ? answerImpact(question, draft.quickAnswers, draft.items) : null;
  const totalKcal = draft.items.reduce((s, i) => s + i.nutrients.kcal, 0);
  const now = new Date();
  const timeOf = (m: MealType) =>
    multiMeal ? (draft.groupTimes[m] ?? timeForMealType(m, now)) : draft.time;
  const subtitle = [
    draft.date === todayLocal() ? t('common.today') : formatDay(draft.date),
    t('review.mealsCount', { count: groups.length }),
  ].join(' · ');

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
    for (const item of draft.items) if (item.id && mealOf(item) === from) itemMeals[item.id] = to;
    patch({ itemMeals });
    setGroupEditing(to);
  };
  const setGroupTime = (m: MealType, time: { h: number; m: number }) =>
    multiMeal ? patch({ groupTimes: { ...draft.groupTimes, [m]: time } }) : patch({ time });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Screen edges={['top', 'left', 'right']} padded={false}>
        <View style={styles.header}>
          <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={discard} />
          <View style={styles.flex}>
            <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
              {draft.dishName ?? t('review.title')}
            </AppText>
            <AppText
              variant="caption"
              color={draft.date !== todayLocal() ? 'warning' : 'textMuted'}
            >
              {subtitle}
            </AppText>
          </View>
        </View>
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
            const kcal = g.items.reduce((s, x) => s + x.item.nutrients.kcal, 0);
            const editing = groupEditing === g.mealType;
            return (
              <View key={g.mealType} style={styles.group}>
                <GroupHeader
                  mealType={g.mealType}
                  time={timeOf(g.mealType)}
                  kcal={kcal}
                  editing={editing}
                  onPress={() => setGroupEditing(editing ? null : g.mealType)}
                />
                {editing ? (
                  <View style={[styles.editor, { backgroundColor: colors.surface }]}>
                    <MealTypePicker
                      value={g.mealType}
                      onChange={(m) =>
                        multiMeal
                          ? setGroupMeal(g.mealType, m)
                          : (patch({ mealType: m }), setGroupEditing(m))
                      }
                    />
                    <TimeStepper
                      value={timeOf(g.mealType)}
                      onChange={(time) => setGroupTime(g.mealType, time)}
                    />
                  </View>
                ) : null}
                {g.items.map(({ item, index }) => (
                  <DraftItemCard
                    key={item.id ?? index}
                    item={item}
                    index={index}
                    baseGrams={draft.original?.find((o) => o.id === item.id)?.grams}
                    showConfidence
                  />
                ))}
              </View>
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

          <View style={styles.extras}>
            <AppText variant="bodyStrong">{t('review.hiddenTitle')}</AppText>
            <View style={styles.chips}>
              {HIDDEN_EXTRAS.map((x) => {
                const food = getRegionalFood(x.id);
                if (!food) return null;
                const added = draft.items.findIndex((i) => i.food_id === x.id);
                return (
                  <Chip
                    key={x.id}
                    icon={added >= 0 ? 'check' : 'add'}
                    selected={added >= 0}
                    label={t(`review.extras.${x.key}`)}
                    onPress={() =>
                      added >= 0
                        ? removeItem(added)
                        : addItem({ ...makeItem(food, x.grams), user_edited: true })
                    }
                  />
                );
              })}
            </View>
          </View>

          {draft.notes ? <Banner tone="info" message={draft.notes} /> : null}
          <AppText variant="caption" color="textSubtle">
            {t('review.estimatedNote')}
            {!savePhotos && scan.photo ? ` ${t('review.dontSavePhoto')}` : ''}
          </AppText>

          {reporting ? (
            <Card style={styles.card}>
              <TextField
                label={t('review.reportTitle')}
                placeholder={t('review.reportPlaceholder')}
                value={report}
                onChangeText={setReport}
                multiline
                maxLength={1000}
              />
              <Button
                label={t('common.save')}
                size="md"
                onPress={sendReport}
                disabled={!report.trim()}
              />
            </Card>
          ) : (
            <Button
              label={t('review.report')}
              variant="ghost"
              size="sm"
              icon="flag"
              onPress={() => setReporting(true)}
            />
          )}
        </View>
      </Screen>

      {/* Fixed footer: correct by voice/text and save, always reachable. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient
          colors={[`${colors.background}00`, colors.background]}
          locations={[0, 0.28]}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
        >
          <CorrectionBar
            onSubmit={correction.correct}
            busy={correction.busy}
            error={correction.error}
          />
          <Button
            label={
              multiMeal
                ? t('review.saveManyKcal', { count: groups.length, kcal: formatKcal(totalKcal) })
                : t('review.saveKcal', { kcal: formatKcal(totalKcal) })
            }
            icon="check"
            onPress={save}
            loading={saving}
            disabled={!draft.items.length || correction.busy}
            testID="review-save"
          />
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
  },
  content: { paddingHorizontal: spacing.lg, gap: 14, paddingBottom: 200 },
  photo: { width: '100%', height: 140, borderRadius: radii.xxl },
  card: { gap: spacing.md },
  group: { gap: spacing.sm },
  editor: { gap: spacing.md, padding: spacing.md, borderRadius: radii.xl },
  extras: { gap: spacing.sm, paddingTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
});
