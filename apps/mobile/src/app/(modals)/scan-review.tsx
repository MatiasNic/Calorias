import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, View } from 'react-native';
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
import { HIDDEN_EXTRAS } from '@/features/diary/cooking';
import { saveMeal } from '@/features/diary/hooks';
import { makeItem } from '@/features/diary/mealMath';
import { MealTypePicker } from '@/features/diary/MealTypePicker';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { getRegionalFood } from '@/features/foods/search';
import { checkAchievements } from '@/features/habits/hooks';
import { AnalyzingView } from '@/features/scan/AnalyzingView';
import { useScanStore } from '@/features/scan/store';
import { draftFromAnalysis } from '@/features/scan/toDraft';
import { useAiError } from '@/features/scan/useAiError';
import { analyzeMealPhoto, reportAiMistake } from '@/services/ai';
import { track } from '@/services/analytics';
import { prepareMealImage, persistLocalPhoto } from '@/services/image';
import { cancelMealReminderToday } from '@/services/notifications';
import { usePlan } from '@/services/purchases';
import { queryClient } from '@/services/queryClient';
import { usePrefsStore } from '@/stores/prefs';
import { radii, spacing } from '@/theme';
import { timestampFor } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

type Phase = 'analyzing' | 'review' | 'not_food' | 'error';

export default function ScanReview() {
  const { t } = useTranslation();
  const scan = useScanStore();
  const { draft, start, patch, addItem, clear } = useDraftStore();
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
      const { result, photoPath } = await analyzeMealPhoto(img, scan.mealType ?? undefined);
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
      start(draftFromAnalysis(scan.result, { source: scan.source }));
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

  const save = async () => {
    if (!draft || !draft.items.length) return;
    setSaving(true);
    try {
      const localUri = draft.localPhotoUri
        ? persistLocalPhoto(draft.localPhotoUri, `${Date.now()}`)
        : null;
      await saveMeal({
        date: draft.date,
        eatenAt: timestampFor(draft.date, draft.time),
        mealType: draft.mealType,
        source: draft.source,
        items: draft.items,
        photoPath: draft.photoPath,
        localPhotoUri: localUri,
        aiScanId: draft.aiScanId,
      });
      haptic('success');
      track('meal_saved', { source: draft.source, items: draft.items.length });
      cancelMealReminderToday(draft.mealType).catch(() => undefined);
      checkAchievements().catch(() => undefined);
      toast.success(t('review.saved'));
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
            <Button
              label={t('review.retake')}
              variant="outline"
              icon="camera"
              onPress={() => router.replace('/scan')}
            />
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

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('review.save')}
          icon="checkmark"
          onPress={save}
          loading={saving}
          disabled={!draft.items.length}
          testID="review-save"
        />
      }
    >
      <View style={styles.header}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={discard} />
        <View style={styles.flex}>
          <AppText variant="heading" accessibilityRole="header">
            {draft.dishName ?? t('review.title')}
          </AppText>
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
      <AppText color="textMuted">{t('review.subtitle')}</AppText>
      {lowConfidence ? <Banner tone="warning" message={t('review.lowConfidenceHint')} /> : null}
      {draft.items.map((item, i) => (
        <DraftItemCard
          key={item.id ?? i}
          item={item}
          index={i}
          baseGrams={draft.original?.[i]?.grams}
          showConfidence
        />
      ))}
      <Button
        label={t('review.addItem')}
        variant="outline"
        icon="add"
        onPress={() => router.push({ pathname: '/food-search', params: { target: 'draft' } })}
        testID="review-add-item"
      />

      <Card style={styles.card}>
        <AppText variant="subheading">{draft.hiddenQuestion ?? t('review.hiddenTitle')}</AppText>
        <View style={styles.chips}>
          {HIDDEN_EXTRAS.map((x) => {
            const food = getRegionalFood(x.id);
            if (!food) return null;
            return (
              <Chip
                key={x.id}
                icon="add"
                label={t(`review.extras.${x.key}`)}
                onPress={() => addItem({ ...makeItem(food, x.grams), user_edited: true })}
              />
            );
          })}
        </View>
        <AppText variant="caption" color="textMuted">
          {t('review.cookingHint')}
        </AppText>
      </Card>

      <DraftTotals items={draft.items} />
      <MealTypePicker value={draft.mealType} onChange={(m) => patch({ mealType: m })} />
      <TimeStepper value={draft.time} onChange={(time) => patch({ time })} />
      {draft.notes ? <Banner tone="info" message={draft.notes} /> : null}
      <AppText variant="caption" color="textMuted">
        {t('review.estimatedNote')}
        {!savePhotos ? ` ${t('review.dontSavePhoto')}` : ''}
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
  photo: { width: '100%', height: 200, borderRadius: radii.xl },
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
