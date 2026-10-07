import {
  SUPPLEMENT_PRESETS,
  SUPPLEMENT_UNITS,
  type IsoDate,
  type SupplementUnit,
} from '@plato/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  toast,
} from '@/components';
import { TimeStepper } from '@/features/diary/TimeStepper';
import { rescheduleReminders } from '@/features/settings/useNotificationSettings';
import { deleteSupplement, saveSupplement, useSupplement } from '@/features/supplements/hooks';
import { WEEK_ORDER, weekdayName } from '@/features/training/labels';
import type { SupplementRecord } from '@/services/db/types';
import { notificationPermission, requestNotificationPermission } from '@/services/notifications';
import { spacing } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatNumber, parseDecimal } from '@/utils/format';

const MAX_TIMES = 6;
const DEFAULT_TIME = '09:00';
const pad = (n: number) => String(n).padStart(2, '0');
const toTime = (v: { h: number; m: number }) => `${pad(v.h)}:${pad(v.m)}`;
const fromTime = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return { h: h ?? 9, m: m ?? 0 };
};
const numText = (n: number | null | undefined, digits = 1) =>
  n == null ? '' : formatNumber(n, digits);

export default function SupplementModal() {
  const params = useLocalSearchParams<{ id?: string }>();
  const existing = useSupplement(params.id);
  if (params.id && !existing.data) return null;
  return <SupplementForm initial={existing.data ?? null} />;
}

function SupplementForm({ initial }: { initial: SupplementRecord | null }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [preset, setPreset] = useState<string | null>(initial?.preset ?? null);
  const [amount, setAmount] = useState(numText(initial?.dose_amount ?? 1, 2));
  const [unit, setUnit] = useState<SupplementUnit>(initial?.dose_unit ?? 'capsule');
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [times, setTimes] = useState<string[]>(initial?.times ?? [DEFAULT_TIME]);
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
  const nonNeg = (s: string) => Math.max(0, parseDecimal(s) ?? 0);
  const optionalInt = (s: string) => {
    const v = parseDecimal(s);
    return v == null || v < 0 ? null : Math.round(v);
  };

  const pickPreset = (p: (typeof SUPPLEMENT_PRESETS)[number]) => {
    setPreset(p.key);
    setName(t(`supplements.presets.${p.key}`));
    setUnit(p.unit);
    setAmount(numText(p.amount, 2));
    if (p.key === 'whey' || p.key === 'collagen') setHasNutrition(true);
  };

  const toggleDay = (d: number) => {
    // Empty = every day; selecting all seven also means every day.
    const base = days.length === 0 ? [...WEEK_ORDER] : days;
    const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d];
    setDays(next.length === 7 || next.length === 0 ? [] : next.sort());
  };

  const save = async () => {
    if (!valid) return;
    if (reminders && active && (await notificationPermission()) !== 'granted') {
      await requestNotificationPermission().catch(() => false);
    }
    await saveSupplement({
      id: initial?.id,
      name: name.trim(),
      preset,
      dose_amount: dose,
      dose_unit: unit,
      days,
      times: [...new Set(times)].sort(),
      reminders,
      stock: optionalInt(stock),
      low_stock_threshold: optionalInt(threshold),
      nutrition: hasNutrition
        ? {
            kcal: nonNeg(kcal),
            protein_g: nonNeg(protein),
            carbs_g: nonNeg(carbs),
            fat_g: nonNeg(fat),
          }
        : null,
      count_in_macros: hasNutrition && countInMacros,
      active,
      start_date: initial?.start_date ?? (todayLocal() as IsoDate),
      note: note.trim() || null,
    });
    rescheduleReminders().catch(() => undefined);
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
          rescheduleReminders().catch(() => undefined);
          router.back();
        },
      },
    ]);

  const switchRow = (
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
    hint?: string,
  ) => (
    <View style={styles.row}>
      <View style={styles.flex}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="textMuted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('common.save')}
          onPress={save}
          disabled={!valid}
          testID="supplement-save"
        />
      }
    >
      <ScreenHeader
        close
        title={initial ? t('supplements.editTitle') : t('supplements.newTitle')}
        right={
          initial ? (
            <IconButton
              icon="trash-outline"
              color="textMuted"
              accessibilityLabel={t('common.delete')}
              onPress={remove}
            />
          ) : undefined
        }
      />

      <TextField
        label={t('supplements.name')}
        placeholder={t('supplements.namePlaceholder')}
        value={name}
        onChangeText={(v) => {
          setName(v);
          setPreset(null);
        }}
        maxLength={60}
        testID="supplement-name"
      />
      {!initial ? (
        <View style={styles.group}>
          <AppText variant="caption" color="textMuted">
            {t('supplements.quickPicks')}
          </AppText>
          <View style={styles.wrap}>
            {SUPPLEMENT_PRESETS.map((p) => (
              <Chip
                key={p.key}
                label={t(`supplements.presets.${p.key}`)}
                selected={preset === p.key}
                onPress={() => pickPreset(p)}
                testID={`preset-${p.key}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      <SectionHeader title={t('supplements.dose')} />
      <TextField
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        maxLength={7}
        accessibilityLabel={t('supplements.dose')}
        suffix={t(`supplements.units.${unit}`, { count: dose ?? 1 })}
      />
      <View style={styles.wrap}>
        {SUPPLEMENT_UNITS.map((u) => (
          <Chip
            key={u}
            label={t(`supplements.units.${u}`, { count: 1 })}
            selected={unit === u}
            onPress={() => setUnit(u)}
          />
        ))}
      </View>

      <SectionHeader title={t('supplements.schedule')} />
      <View style={styles.wrap}>
        <Chip
          label={t('supplements.everyDay')}
          selected={days.length === 0}
          onPress={() => setDays([])}
        />
        {WEEK_ORDER.map((d) => (
          <Chip
            key={d}
            label={weekdayName(d)}
            selected={days.length === 0 || days.includes(d)}
            onPress={() => toggleDay(d)}
          />
        ))}
      </View>
      <AppText variant="label" color="textMuted">
        {t('supplements.times')}
      </AppText>
      {times.map((time, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.flex}>
            <TimeStepper
              value={fromTime(time)}
              onChange={(v) => setTimes((xs) => xs.map((x, j) => (j === i ? toTime(v) : x)))}
            />
          </View>
          <IconButton
            icon="remove-circle-outline"
            color="textMuted"
            disabled={times.length <= 1}
            accessibilityLabel={t('supplements.removeTime', { time })}
            onPress={() => setTimes((xs) => xs.filter((_, j) => j !== i))}
          />
        </View>
      ))}
      {times.length < MAX_TIMES ? (
        <Button
          label={t('supplements.addTime')}
          variant="ghost"
          size="sm"
          icon="add"
          fullWidth={false}
          onPress={() => {
            const last = fromTime(times[times.length - 1] ?? DEFAULT_TIME);
            setTimes((xs) => [...xs, toTime({ h: Math.min(23, last.h + 4), m: last.m })]);
          }}
        />
      ) : null}
      <Card style={styles.group}>
        {switchRow(t('supplements.reminders'), reminders, setReminders)}
      </Card>

      <SectionHeader title={t('supplements.stock')} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={t('supplements.stock')}
            placeholder={t('supplements.stockPlaceholder')}
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label={t('supplements.lowThreshold')}
            placeholder="5"
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      <AppText variant="caption" color="textMuted">
        {t('supplements.stockHint')}
      </AppText>

      <Card style={styles.group}>
        {switchRow(
          t('supplements.nutrition'),
          hasNutrition,
          setHasNutrition,
          t('supplements.nutritionHint'),
        )}
        {hasNutrition ? (
          <>
            <AppText variant="label" color="textMuted">
              {`${t('supplements.perDose')} (${amount || '1'} ${t(`supplements.units.${unit}`, {
                count: dose ?? 1,
              })})`}
            </AppText>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label="kcal"
                  testID="supplement-kcal"
                  value={kcal}
                  onChangeText={setKcal}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('macros.protein')}
                  testID="supplement-protein"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="decimal-pad"
                  suffix="g"
                  maxLength={5}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label={t('macros.carbs')}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="decimal-pad"
                  suffix="g"
                  maxLength={5}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('macros.fat')}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  suffix="g"
                  maxLength={5}
                />
              </View>
            </View>
            {switchRow(t('supplements.countInMacros'), countInMacros, setCountInMacros)}
          </>
        ) : null}
      </Card>

      {initial ? (
        <Card style={styles.group}>
          {switchRow(t('supplements.active'), active, setActive, t('supplements.activeHint'))}
        </Card>
      ) : null}

      <TextField
        label={t('supplements.note')}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={300}
      />
      <View style={styles.row}>
        <Icon name="information-circle-outline" size={18} color="textSubtle" />
        <AppText variant="caption" color="textSubtle" style={styles.flex}>
          {t('supplements.disclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.sm },
});
