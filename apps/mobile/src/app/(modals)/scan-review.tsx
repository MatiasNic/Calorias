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
import { Alert, BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Screen,
  TextField,
  toast,
} from '@/components';
import { DraftItemCard } from '@/features/diary/DraftItemCard';
import { DraftTotals } from '@/features/diary/DraftTotals';
import { useDraftStore } from '@/features/diary/draftStore';
import {
  applyCookingMethod,
  cookingChoicesFor,
  HIDDEN_EXTRAS,
  isCookable,
} from '@/features/diary/cooking';
import { saveMeal } from '@/features/diary/hooks';
import { makeItem } from '@/features/diary/mealMath';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { getRegionalFood } from '@/features/foods/search';
import { checkAchievements } from '@/features/habits/hooks';
import { AnalyzingView } from '@/features/scan/AnalyzingView';
import { CorrectionBar } from '@/features/scan/CorrectionBar';
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
  const [editWhen, setEditWhen] = useState(false);
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
        const time = groups.length > 1 ? timeForMealType(group.mealType, now) : draft.time;
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
  const lowConfidence = draft.items.some((i) => (i.ai_confidence ?? 1) < 0.5);
  const cookable = draft.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isCookable(item));
  const indexed = draft.items.map((item, index) => ({ item, index }));
  const groups = groupByMealType(indexed, ({ item }) => mealOf(item)).sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType),
  );
  const multiMeal = groups.length > 1;
  const aiQuestion =
    draft.hiddenQuestion && draft.quickAnswers.length ? draft.hiddenQuestion : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const whenLabel = [
    t(`mealTypes.${draft.mealType}`),
    `${pad(draft.time.h)}:${pad(draft.time.m)}`,
    draft.date === todayLocal() ? t('common.today') : formatDay(draft.date),
  ].join(' · ');

  const setGroupMeal = (from: MealType, to: MealType) => {
    const itemMeals = { ...draft.itemMeals };
    for (const item of draft.items) if (item.id && mealOf(item) === from) itemMeals[item.id] = to;
    patch({ itemMeals });
    setGroupEditing(null);
  };

  const renderItem = ({ item, index }: { item: MealItem; index: number }) => (
    <DraftItemCard
      key={item.id ?? index}
      item={item}
      index={index}
      baseGrams={draft.original?.find((o) => o.id === item.id)?.grams}
      showConfidence
    />
  );

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={multiMeal ? t('review.saveMany', { count: groups.length }) : t('review.save')}
          icon="checkmark"
          onPress={save}
          loading={saving}
          disabled={!draft.items.length || correction.busy}
          testID="review-save"
        />
      }
    >
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={discard} />
        <View style={styles.flex}>
          <AppText variant="heading" accessibilityRole="header" numberOfLines={2}>
            {draft.dishName ?? t('review.title')}
          </AppText>
          {draft.date && draft.date !== todayLocal() ? (
            <AppText variant="caption" color="warning">
              {t('review.forDay', { day: formatDay(draft.date) })}
            </AppText>
          ) : null}
        </View>
      </View>
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
          icon="flask-outline"
          title={t('review.demoTitle')}
          message={t('review.demoMessage')}
        />
      ) : null}

      {/* One short question with one-tap answers (sent back to the AI as a correction). */}
      {aiQuestion ? (
        <Card style={styles.card}>
          <AppText variant="subheading">{aiQuestion}</AppText>
          <View style={styles.chips}>
            {draft.quickAnswers.map((a) => (
              <Chip
                key={a}
                label={a}
                onPress={() => {
                  if (!correction.busy) void correction.correct(`${aiQuestion} ${a}`);
                }}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <DraftTotals items={draft.items} />

      {multiMeal ? (
        groups.map((g) => {
          const kcal = g.items.reduce((s, x) => s + x.item.nutrients.kcal, 0);
          return (
            <View key={g.mealType} style={styles.group}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('review.changeMeal', { meal: t(`mealTypes.${g.mealType}`) })}
                accessibilityState={{ expanded: groupEditing === g.mealType }}
                onPress={() => setGroupEditing(groupEditing === g.mealType ? null : g.mealType)}
                style={styles.groupHead}
              >
                <AppText variant="subheading">{t(`mealTypes.${g.mealType}`)}</AppText>
                <Icon name="create-outline" size={16} color="textMuted" />
                <View style={styles.flex} />
                <AppText variant="caption" color="textMuted" tabular>
                  {formatKcal(kcal)} kcal
                </AppText>
              </Pressable>
              {groupEditing === g.mealType ? (
                <MealTypePicker value={g.mealType} onChange={(m) => setGroupMeal(g.mealType, m)} />
              ) : null}
              {g.items.map(renderItem)}
            </View>
          );
        })
      ) : (
        <View style={styles.group}>{indexed.map(renderItem)}</View>
      )}
      {lowConfidence ? (
        <AppText variant="caption" color="textMuted">
          {t('review.lowConfidenceHint')}
        </AppText>
      ) : null}
      <Button
        label={t('review.addItem')}
        variant="ghost"
        size="md"
        icon="add"
        onPress={() => router.push({ pathname: '/food-search', params: { target: 'draft' } })}
        testID="review-add-item"
      />

      <CorrectionBar
        onSubmit={correction.correct}
        busy={correction.busy}
        error={correction.error}
      />

      {!multiMeal ? (
        <View style={[styles.when, { borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: editWhen }}
            accessibilityLabel={t('review.changeWhen', { when: whenLabel })}
            onPress={() => setEditWhen(!editWhen)}
            style={styles.whenHead}
          >
            <Icon name="time-outline" size={18} color="textMuted" />
            <AppText variant="bodyStrong" style={styles.flex}>
              {whenLabel}
            </AppText>
            <AppText variant="label" color="primary">
              {editWhen ? t('common.done') : t('review.change')}
            </AppText>
          </Pressable>
          {editWhen ? (
            <View style={styles.card}>
              <MealTypePicker value={draft.mealType} onChange={(m) => patch({ mealType: m })} />
              <TimeStepper value={draft.time} onChange={(time) => patch({ time })} />
            </View>
          ) : null}
        </View>
      ) : null}

      <Card style={styles.card}>
        {!aiQuestion && cookable.length ? (
          <>
            <AppText variant="subheading">{t('review.cookingTitle')}</AppText>
            {cookable.map(({ item, index }) => (
              <View key={item.id ?? index} style={styles.cookRow}>
                <AppText variant="label" color="textMuted">
                  {item.display_name}
                </AppText>
                <View style={styles.chips}>
                  {cookingChoicesFor(item).map((m) => (
                    <Chip
                      key={m}
                      label={t(`cooking.${m}`)}
                      selected={item.cooking_method === m}
                      onPress={() =>
                        updateItem(index, { ...applyCookingMethod(item, m), user_edited: true })
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : null}
        <AppText variant="label" color="textMuted">
          {t('review.hiddenTitle')}
        </AppText>
        <View style={styles.chips}>
          {HIDDEN_EXTRAS.map((x) => {
            const food = getRegionalFood(x.id);
            if (!food) return null;
            const added = draft.items.findIndex((i) => i.food_id === x.id);
            return (
              <Chip
                key={x.id}
                icon={added >= 0 ? 'checkmark' : 'add'}
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
      </Card>

      {draft.notes ? <Banner tone="info" message={draft.notes} /> : null}
      <AppText variant="caption" color="textMuted">
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
          size="md"
          icon="flag-outline"
          onPress={() => setReporting(true)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  photo: { width: '100%', height: 160, borderRadius: radii.xl },
  group: { gap: spacing.sm },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  when: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.md, gap: spacing.md },
  whenHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cookRow: { gap: spacing.xs },
});
