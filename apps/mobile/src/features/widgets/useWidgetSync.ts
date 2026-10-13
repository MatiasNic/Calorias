import type { DailySummary } from '@bocado/shared';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useUsualMeals } from '@/features/diary/components/UsualMeals';
import { todayLocal } from '@/utils/dates';
import { readQueue, readSnapshot, type WidgetSnapshot } from './snapshot';
import { updateWidgets } from './sync';

const USUAL_LIMIT = 4;

/** Keeps the home-screen widgets showing today's numbers and the usual meals (Android). */
export function useWidgetSync(day: {
  isLoading: boolean;
  summary: DailySummary;
  waterMl: number;
  waterTargetMl: number;
}) {
  const { t } = useTranslation();
  const usual = useUsualMeals();
  const { consumed, target } = day.summary;
  const consumedKcal = Math.round(consumed.kcal);
  const targetKcal = Math.round(consumed.kcal + day.summary.remainingKcal);
  const round = (n: number) => Math.round(n);
  const key = JSON.stringify([
    todayLocal(),
    consumedKcal,
    targetKcal,
    round(consumed.protein_g),
    round(consumed.carbs_g),
    round(consumed.fat_g),
    target.protein_g,
    target.carbs_g,
    target.fat_g,
    day.waterMl,
    day.waterTargetMl,
    usual.data?.map((u) => u.record.id),
  ]);

  useEffect(() => {
    if (Platform.OS !== 'android' || day.isLoading) return;
    // Widget taps not saved yet: the widget already shows them; wait for the app to save them.
    if (readQueue().length) return;
    const today = todayLocal();
    const prev = readSnapshot();
    const snapshot: WidgetSnapshot = {
      date: today,
      targetKcal,
      consumedKcal,
      protein: { value: round(consumed.protein_g), target: round(target.protein_g) },
      carbs: { value: round(consumed.carbs_g), target: round(target.carbs_g) },
      fat: { value: round(consumed.fat_g), target: round(target.fat_g) },
      waterMl: day.waterMl,
      waterTargetMl: day.waterTargetMl,
      usual: (usual.data ?? []).slice(0, USUAL_LIMIT).map((u) => ({
        recordId: u.record.id,
        mealType: u.mealType,
        mealLabel: t(`mealTypes.${u.mealType}`),
        names: u.record.items.map((i) => i.display_name).join(', '),
        kcal: round(u.record.totals.kcal),
        protein: round(u.record.totals.protein_g),
        carbs: round(u.record.totals.carbs_g),
        fat: round(u.record.totals.fat_g),
      })),
      loggedUsual: prev?.date === today ? (prev.loggedUsual ?? []) : [],
      labels: {
        left: t('today.leftLabel'),
        over: t('today.overLabel'),
        consumed: t('widgets.consumed'),
        goal: t('widgets.goal'),
        talk: t('widgets.talk'),
        photo: t('widgets.photo'),
        write: t('widgets.write'),
        water: t('widgets.water.label'),
        usual: t('widgets.usual.title'),
        usualEmpty: t('widgets.usual.empty'),
        logged: t('widgets.logged'),
        undo: t('widgets.undo'),
      },
    };
    void updateWidgets(snapshot);
    // `key` sums up every number shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, day.isLoading, t]);
}
