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
    // From a cold start the shortcut is the only screen: land on Today (popping back to it when
    // the app was already open) and open the screen on top of it, so closing it or Android back
    // returns to the app instead of closing it.
    const home = () => router.dismissTo('/today');
    const open = (href: '/listen' | '/scan' | '/text-log') => {
      home();
      router.push(href);
    };
    const run = async () => {
      if (action === 'listen' || action === 'escuchar') return open('/listen');
      if (action === 'camera' || action === 'camara') return open('/scan');
      if (action === 'write' || action === 'escribir') return open('/text-log');
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
          return open('/listen');
        }
        await duplicateMeal(entry.record, today, entry.mealType);
        toast.success(
          t('shortcuts.usualDone', { meal: t(`mealTypes.${entry.mealType}`).toLowerCase() }),
        );
      }
      home();
    };
    run().catch((e) => {
      captureError(e, { where: 'shortcut', action });
      home();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
