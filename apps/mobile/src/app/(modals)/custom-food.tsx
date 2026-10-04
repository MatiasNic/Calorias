import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  AppText,
  Banner,
  Button,
  IconButton,
  Screen,
  SegmentedControl,
  TextField,
  toast,
} from '@/components';
import { useCustomFoodPrefill } from '@/features/foods/customFoodPrefill';
import { usePickerStore } from '@/features/foods/pickerStore';
import { newId, repos } from '@/services/db/repository';
import { spacing } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { parseDecimal } from '@/utils/format';

const num = z.string().refine((v) => v.trim() === '' || (parseDecimal(v) ?? -1) >= 0, 'invalid');
const requiredNum = z.string().refine((v) => (parseDecimal(v) ?? -1) >= 0, 'required');

const Schema = z.object({
  name: z.string().trim().min(1, 'required').max(120),
  brand: z.string().max(80),
  barcode: z.string().max(32),
  basis: z.enum(['100g', 'serving']),
  servingGrams: num,
  kcal: requiredNum,
  protein: requiredNum,
  carbs: requiredNum,
  fat: requiredNum,
  fiber: num,
  sugar: num,
  sodium: num,
});
type Values = z.infer<typeof Schema>;

export default function CustomFood() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ name?: string; barcode?: string }>();
  const prefill = useCustomFoodPrefill((s) => s.prefill);
  const { control, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: params.name ?? '',
      brand: '',
      barcode: params.barcode ?? '',
      basis: '100g',
      servingGrams: '',
      kcal: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
      sugar: '',
      sodium: '',
    },
  });

  useEffect(() => {
    if (!prefill) return;
    const s = (v: number | null | undefined) => (v == null ? '' : String(Math.round(v * 10) / 10));
    reset({
      name: prefill.name ?? params.name ?? '',
      brand: prefill.brand ?? '',
      barcode: prefill.barcode ?? params.barcode ?? '',
      basis: '100g',
      servingGrams: s(prefill.servingGrams),
      kcal: s(prefill.per100g?.kcal),
      protein: s(prefill.per100g?.protein_g),
      carbs: s(prefill.per100g?.carbs_g),
      fat: s(prefill.per100g?.fat_g),
      fiber: s(prefill.per100g?.fiber_g),
      sugar: s(prefill.per100g?.sugar_g),
      sodium: s(prefill.per100g?.sodium_mg),
    });
  }, [prefill, reset, params.name, params.barcode]);

  const basis = useWatch({ control, name: 'basis' });

  const onSave = handleSubmit(async (v) => {
    const serving = parseDecimal(v.servingGrams);
    if (v.basis === 'serving' && !serving) return;
    const factor = v.basis === 'serving' && serving ? 100 / serving : 1;
    const p = (s: string) => {
      const n = parseDecimal(s);
      return n == null ? undefined : Math.round(n * factor * 10) / 10;
    };
    const id = newId();
    await repos.foodsCustom.upsert({
      id,
      name: v.name.trim(),
      brand: v.brand.trim() || null,
      barcode: v.barcode.trim() || null,
      per100g: {
        kcal: p(v.kcal) ?? 0,
        protein_g: p(v.protein) ?? 0,
        carbs_g: p(v.carbs) ?? 0,
        fat_g: p(v.fat) ?? 0,
        fiber_g: p(v.fiber),
        sugar_g: p(v.sugar),
        sodium_mg: p(v.sodium),
      },
      servings: serving ? [{ unit: 'serving', grams: serving }] : [],
      origin: prefill?.origin ?? 'manual',
    });
    useCustomFoodPrefill.getState().set(null);
    toast.success(t('customFood.saved'));
    const created = await repos.foodsCustom.get(id);
    if (created) {
      const picker = usePickerStore.getState();
      if (!picker.target) picker.open({ kind: 'diary', date: todayLocal(), mealType: 'snack' });
      picker.select({
        key: `custom:${id}`,
        id,
        source: 'custom',
        name: created.name,
        brand: created.brand,
        barcode: created.barcode,
        per100g: created.per100g,
        servings: created.servings,
      });
      router.replace('/food-detail');
    } else router.back();
  });

  const field = (
    name: keyof Values,
    label: string,
    opts: { suffix?: string; numeric?: boolean } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f, fieldState }) => (
        <TextField
          label={label}
          value={String(f.value)}
          onChangeText={f.onChange}
          keyboardType={opts.numeric ? 'decimal-pad' : 'default'}
          suffix={opts.suffix}
          error={fieldState.error ? t('customFood.invalid') : null}
        />
      )}
    />
  );

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        <Button
          label={t('common.save')}
          onPress={onSave}
          loading={formState.isSubmitting}
          testID="custom-food-save"
        />
      }
    >
      <View style={styles.header}>
        <IconButton
          icon="close"
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
        />
        <AppText variant="heading">{t('customFood.title')}</AppText>
      </View>
      {prefill?.origin === 'label' ? (
        <Banner tone="info" message={t('customFood.fromLabel')} />
      ) : null}
      {field('name', t('customFood.name'))}
      {field('brand', t('customFood.brand'))}
      {field('barcode', t('customFood.barcode'), { numeric: true })}
      <Controller
        control={control}
        name="basis"
        render={({ field: f }) => (
          <SegmentedControl<'100g' | 'serving'>
            value={f.value}
            onChange={f.onChange}
            options={[
              { value: '100g', label: t('customFood.per100') },
              { value: 'serving', label: t('customFood.perServing') },
            ]}
          />
        )}
      />
      {field('servingGrams', t('customFood.servingSize'), { suffix: 'g', numeric: true })}
      {basis === 'serving' ? (
        <AppText variant="caption" color="textMuted">
          {t('customFood.servingHint')}
        </AppText>
      ) : null}
      {field('kcal', t('common.kcal'), { suffix: 'kcal', numeric: true })}
      {field('protein', t('macros.protein'), { suffix: 'g', numeric: true })}
      {field('carbs', t('macros.carbs'), { suffix: 'g', numeric: true })}
      {field('fat', t('macros.fat'), { suffix: 'g', numeric: true })}
      {field('fiber', t('macros.fiber'), { suffix: 'g', numeric: true })}
      {field('sugar', t('macros.sugar'), { suffix: 'g', numeric: true })}
      {field('sodium', t('macros.sodium'), { suffix: 'mg', numeric: true })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
