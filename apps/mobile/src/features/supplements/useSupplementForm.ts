import {
  SUPPLEMENT_FORM,
  nextScheduleTime,
  nonNegative,
  normalizeScheduleTimes,
  optionalCount,
  presetHasNutrition,
  toggleScheduleDay,
  type IsoDate,
  type SUPPLEMENT_PRESETS,
  type SupplementUnit,
} from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toast } from '@/components';
import { rescheduleReminders } from '@/features/settings/useNotificationSettings';
import { captureError } from '@/services/analytics';
import type { SupplementRecord } from '@/services/db/types';
import { notificationPermission, requestNotificationPermission } from '@/services/notifications';
import { todayLocal } from '@/utils/dates';
import { formatNumber, parseDecimal } from '@/utils/format';
import { deleteSupplement, saveSupplement } from './hooks';

export type SupplementPreset = (typeof SUPPLEMENT_PRESETS)[number];

/** Number as editable text ('' when absent). */
const numText = (n: number | null | undefined, digits = 1) =>
  n == null ? '' : formatNumber(n, digits);

/** State, derived values and actions of the supplement editor. */
export function useSupplementForm(initial: SupplementRecord | null) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [preset, setPreset] = useState<string | null>(initial?.preset ?? null);
  const [amount, setAmount] = useState(numText(initial?.dose_amount ?? 1, 2));
  const [unit, setUnit] = useState<SupplementUnit>(initial?.dose_unit ?? 'capsule');
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [times, setTimes] = useState<string[]>(initial?.times ?? [SUPPLEMENT_FORM.defaultTime]);
  const [reminders, setReminders] = useState(initial?.reminders ?? true);
  const [stock, setStock] = useState(numText(initial?.stock, 0));
  const [threshold, setThreshold] = useState(numText(initial?.low_stock_threshold, 0));
  const [hasNutrition, setHasNutrition] = useState(!!initial?.nutrition);
  const [kcal, setKcal] = useState(numText(initial?.nutrition?.kcal, 0));
  const [protein, setProtein] = useState(numText(initial?.nutrition?.protein_g));
  const [carbs, setCarbs] = useState(numText(initial?.nutrition?.carbs_g));
  const [fat, setFat] = useState(numText(initial?.nutrition?.fat_g));
  const [countInMacros, setCountInMacros] = useState(initial?.count_in_macros ?? true);
  const [active, setActive] = useState(initial?.active ?? true);
  const [note, setNote] = useState(initial?.note ?? '');

  const dose = parseDecimal(amount);
  const valid = name.trim().length > 0 && dose != null && dose > 0 && times.length > 0;

  /** Typing a name detaches it from the preset. */
  const changeName = (v: string) => {
    setName(v);
    setPreset(null);
  };

  const pickPreset = (p: SupplementPreset) => {
    setPreset(p.key);
    setName(t(`supplements.presets.${p.key}`));
    setUnit(p.unit);
    setAmount(numText(p.amount, 2));
    if (presetHasNutrition(p.key)) setHasNutrition(true);
  };

  const toggleDay = (d: number) => setDays(toggleScheduleDay(days, d));

  const changeTime = (i: number, time: string) =>
    setTimes((xs) => xs.map((x, j) => (j === i ? time : x)));
  const removeTime = (i: number) => setTimes((xs) => xs.filter((_, j) => j !== i));
  const addTime = () => {
    const next = nextScheduleTime(times[times.length - 1]);
    setTimes((xs) => [...xs, next]);
  };

  const save = async () => {
    if (!valid) return;
    if (reminders && active && (await notificationPermission()) !== 'granted') {
      await requestNotificationPermission().catch((e) =>
        captureError(e, { where: 'requestNotificationPermission:supplement' }),
      );
    }
    await saveSupplement({
      id: initial?.id,
      name: name.trim(),
      preset,
      dose_amount: dose,
      dose_unit: unit,
      days,
      times: normalizeScheduleTimes(times),
      reminders,
      stock: optionalCount(parseDecimal(stock)),
      low_stock_threshold: optionalCount(parseDecimal(threshold)),
      nutrition: hasNutrition
        ? {
            kcal: nonNegative(parseDecimal(kcal)),
            protein_g: nonNegative(parseDecimal(protein)),
            carbs_g: nonNegative(parseDecimal(carbs)),
            fat_g: nonNegative(parseDecimal(fat)),
          }
        : null,
      count_in_macros: hasNutrition && countInMacros,
      active,
      start_date: initial?.start_date ?? (todayLocal() as IsoDate),
      note: note.trim() || null,
    });
    rescheduleReminders().catch((e) =>
      captureError(e, { where: 'rescheduleReminders:supplementSaved' }),
    );
    toast.success(t('supplements.saved'));
    router.back();
  };

  const remove = () =>
    Alert.alert(t('supplements.deleteTitle'), t('supplements.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          if (initial) await deleteSupplement(initial.id);
          rescheduleReminders().catch((e) =>
            captureError(e, { where: 'rescheduleReminders:supplementDeleted' }),
          );
          router.back();
        },
      },
    ]);

  return {
    name,
    changeName,
    preset,
    pickPreset,
    amount,
    setAmount,
    dose,
    unit,
    setUnit,
    days,
    setDays,
    toggleDay,
    times,
    changeTime,
    removeTime,
    addTime,
    canAddTime: times.length < SUPPLEMENT_FORM.maxTimes,
    reminders,
    setReminders,
    stock,
    setStock,
    threshold,
    setThreshold,
    hasNutrition,
    setHasNutrition,
    kcal,
    setKcal,
    protein,
    setProtein,
    carbs,
    setCarbs,
    fat,
    setFat,
    countInMacros,
    setCountInMacros,
    active,
    setActive,
    note,
    setNote,
    valid,
    save,
    remove,
  };
}

export type SupplementForm = ReturnType<typeof useSupplementForm>;
