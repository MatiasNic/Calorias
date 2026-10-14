import { suggestMealType } from '@bocado/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { addWater } from '@/features/body/hooks';
import { loadUsualMeals } from '@/features/diary/components/UsualMeals';
import { duplicateMeal } from '@/features/diary/hooks';
import { captureError } from '@/services/analytics';
import { useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';

/**
 * Launcher shortcuts (long-press the app icon; plugins/withAndroidShortcuts.js). Dictate and
 * photo open their screen; water and "lo de siempre" are logged right away and land on Today.
 */
export default function Shortcut() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { action } = useLocalSearchParams<{ action: string }>();

  useEffect(() => {
    const run = async () => {
      if (action === 'listen' || action === 'escuchar') return router.replace('/listen');
      if (action === 'camera' || action === 'camara') return router.replace('/scan');
      const today = todayLocal();
      if (action === 'water') {
        await addWater(today, 250);
        toast.success(t('shortcuts.waterDone'));
      } else if (action === 'usual') {
        const usual = await loadUsualMeals();
        const slot = suggestMealType(new Date().getHours());
        const entry = usual.find((u) => u.mealType === slot) ?? usual[0];
        if (!entry) {
          toast.info(t('shortcuts.usualEmpty'));
          return router.replace('/listen');
        }
        await duplicateMeal(entry.record, today, entry.mealType);
        toast.success(
          t('shortcuts.usualDone', { meal: t(`mealTypes.${entry.mealType}`).toLowerCase() }),
        );
      }
      router.replace('/today');
    };
    run().catch((e) => {
      captureError(e, { where: 'shortcut', action });
      router.replace('/today');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
