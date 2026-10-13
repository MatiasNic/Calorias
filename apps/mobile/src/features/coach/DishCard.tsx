import type { AnalyzeResponse, CoachDish } from '@bocado/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Icon } from '@/components';
import { useScanStore } from '@/features/scan/store';
import { radii, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { dishTotals } from './logic';

/** Opens the usual meal review with the dish's ingredients, to adjust and save it. */
export function logDish(dish: CoachDish) {
  const result: AnalyzeResponse = {
    scan_id: null,
    cached: false,
    is_food: true,
    dish_name: dish.name,
    // One dish is one meal: per-ingredient meal types would split it.
    items: dish.items.map((i) => ({ ...i, meal_type: null })),
    hidden_ingredients_question: null,
    quick_answers: [],
    notes: null,
    model: 'coach',
    quota: { used: 0, limit: 0, remaining: 0 },
  };
  useScanStore.getState().setTextResult(result, 'text', null, null, dish.meal_type);
  router.push('/scan-review');
}

/** A dish proposed by the coach: totals per portion, ingredients, steps and "Registrar". */
export function DishCard({ dish }: { dish: CoachDish }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const n = dishTotals(dish);
  const macros = [
    { key: 'protein', label: t('macros.proteinShort'), value: n.protein_g, color: colors.protein },
    { key: 'carbs', label: t('macros.carbsShort'), value: n.carbs_g, color: colors.carbs },
    { key: 'fat', label: t('macros.fatShort'), value: n.fat_g, color: colors.fat },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.head}>
        <View style={[styles.tile, { backgroundColor: colors.primarySoft }]}>
          <Icon name="restaurant" size={20} color="success" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{dish.name}</AppText>
          <AppText variant="caption" color="textMuted">
            {[
              dish.meal_type ? t(`mealTypes.${dish.meal_type}`) : null,
              dish.minutes ? t('coach.minutes', { count: dish.minutes }) : null,
              t('coach.perPortion'),
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
        <View style={styles.kcal}>
          <AppText variant="heading" tabular>
            {formatKcal(n.kcal)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            kcal
          </AppText>
        </View>
      </View>
      <View style={styles.macros}>
        {macros.map((m) => (
          <View key={m.key} style={styles.macro}>
            <View style={[styles.dot, { backgroundColor: m.color }]} />
            <AppText variant="caption" color="textMuted" tabular>
              {m.label} {Math.round(m.value)} g
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="textMuted" numberOfLines={open ? undefined : 2}>
        {dish.items.map((i) => `${i.display_name} ${Math.round(i.grams)} g`).join(' · ')}
      </AppText>
      {open && dish.steps.length ? (
        <View style={styles.steps}>
          {dish.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <AppText variant="caption" color="textMuted" style={styles.stepNum}>
                {i + 1}.
              </AppText>
              <AppText variant="body" style={styles.flex}>
                {s}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          hitSlop={8}
          style={styles.toggle}
        >
          <AppText variant="label" color="textMuted">
            {open ? t('coach.hideRecipe') : t('coach.showRecipe')}
          </AppText>
          <Icon name={open ? 'expand_less' : 'expand_more'} size={18} color="textMuted" />
        </Pressable>
        <Button
          label={t('coach.logDish')}
          icon="add"
          size="sm"
          fullWidth={false}
          onPress={() => {
            haptic('selection');
            logDish(dish);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  kcal: { alignItems: 'flex-end' },
  macros: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  macro: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  steps: { gap: spacing.xs },
  step: { flexDirection: 'row', gap: spacing.xs },
  stepNum: { width: 18, paddingTop: 2 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 40 },
});
