import { groupByMealType } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { useDraftStore } from '@/features/diary/draftStore';
import { saveMeal } from '@/features/diary/hooks';
import { checkAchievements } from '@/features/habits/hooks';
import { useScanStore } from '@/features/scan/store';
import { track } from '@/services/analytics';
import { persistLocalPhoto } from '@/services/image';
import { cancelMealReminderToday } from '@/services/notifications';
import { timestampFor } from '@/utils/dates';
import { haptic } from '@/utils/haptics';

import { mealOfItem, mealTimeOf } from './mealGroups';

/** Saves the reviewed draft (one meal per meal type) and closes the scan flow. */
export function useSaveReviewedMeal() {
  const { t } = useTranslation();
  const draft = useDraftStore((s) => s.draft);
  const clear = useDraftStore((s) => s.clear);
  const clearScan = useScanStore((s) => s.clear);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft || !draft.items.length) return;
    setSaving(true);
    try {
      const localUri = draft.localPhotoUri
        ? persistLocalPhoto(draft.localPhotoUri, `${Date.now()}`)
        : null;
      const groups = groupByMealType(draft.items, (item) => mealOfItem(draft, item));
      const now = new Date();
      for (const [i, group] of groups.entries()) {
        // One description with several meals → one meal each, at its usual time.
        const time = mealTimeOf(draft, group.mealType, groups.length > 1, now);
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
      clearScan();
      router.dismissTo('/today');
    } catch {
      toast.error(t('common.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
