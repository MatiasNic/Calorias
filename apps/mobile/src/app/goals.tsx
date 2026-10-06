import { zodResolver } from '@hookform/resolvers/zod';
import {
  SAFETY,
  ActivityLevelSchema,
  GoalTypeSchema,
  kcalFromMacros,
  type ActivityLevel,
  type GoalType,
} from '@plato/shared';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  toast,
} from '@/components';
import { useLatestWeight } from '@/features/body/hooks';
import { GoalWarnings } from '@/features/goals/GoalWarnings';
import { saveCustomGoal, saveGoalFromPlan, useGoalForDate } from '@/features/goals/hooks';
import { planFromProfile, updateProfile, useProfile } from '@/features/profile/hooks';
import { spacing } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal, parseDecimal } from '@/utils/format';

const num = z.string().refine((v) => (parseDecimal(v) ?? -1) >= 0);
const Manual = z.object({ protein: num, carbs: num, fat: num, water: num });

export default function Goals() {
  const { t } = useTranslation();
  const profile = useProfile();
  const latest = useLatestWeight();
  const { goal } = useGoalForDate(todayLocal());
  const p = profile.data;
  const plan = p ? planFromProfile(p, latest.data ?? null) : null;

  const { control, handleSubmit, reset, formState } = useForm<z.infer<typeof Manual>>({
    resolver: zodResolver(Manual),
    defaultValues: { protein: '', carbs: '', fat: '', water: '' },
  });
  useEffect(() => {
    reset({
      protein: String(Math.round(goal.protein_g)),
      carbs: String(Math.round(goal.carbs_g)),
      fat: String(Math.round(goal.fat_g)),
      water: String(goal.water_ml ?? 2000),
    });
  }, [goal, reset]);

  const recalc = async () => {
    if (!plan?.ok) return;
    await saveGoalFromPlan(plan.plan);
    toast.success(t('goals.saved'));
  };

  const saveManual = handleSubmit(async (v) => {
    const macros = {
      protein_g: parseDecimal(v.protein) ?? 0,
      carbs_g: parseDecimal(v.carbs) ?? 0,
      fat_g: parseDecimal(v.fat) ?? 0,
    };
    const kcal = Math.round(kcalFromMacros(macros) / 10) * 10;
    // Same safety floor as computed plans; female floor when sex is unknown is the lower one,
    // so use the male floor only when we know it applies.
    const floor = SAFETY.calorieFloor[p?.sex === 'male' ? 'male' : 'female'];
    if (kcal < floor) {
      toast.error(t('goals.belowFloor', { kcal: formatKcal(kcal), floor: formatKcal(floor) }));
      return;
    }
    await saveCustomGoal({
      ...macros,
      kcal,
      fiber_g: Math.round((kcal / 1000) * 14),
      water_ml: parseDecimal(v.water) ?? goal.water_ml,
      mode: 'fixed',
      tdee_estimate: goal.tdee_estimate,
    });
    toast.success(t('goals.saved'));
  });

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} keyboard>
      <ScreenHeader title={t('goals.editTitle')} />
      <Card style={styles.card}>
        <AppText variant="display" tabular>
          {formatKcal(goal.kcal)} <AppText color="textMuted">kcal</AppText>
        </AppText>
        <AppText color="textMuted">
          P {Math.round(goal.protein_g)} g · C {Math.round(goal.carbs_g)} g · G{' '}
          {Math.round(goal.fat_g)} g · {t('goals.mode')}:{' '}
          {t(goal.mode === 'adaptive' ? 'goals.adaptive' : 'goals.fixed')}
        </AppText>
      </Card>

      <SectionHeader title={t('onboarding.goal.title')} />
      <View style={styles.chips}>
        {GoalTypeSchema.options.map((g: GoalType) => (
          <Chip
            key={g}
            label={t(`onboarding.goal.options.${g}.title`)}
            selected={p?.goal_type === g}
            onPress={() => updateProfile({ goal_type: g })}
          />
        ))}
      </View>
      <SectionHeader title={t('onboarding.activity.title')} />
      <View style={styles.chips}>
        {ActivityLevelSchema.options.map((a: ActivityLevel) => (
          <Chip
            key={a}
            label={t(`onboarding.activity.options.${a}.title`)}
            selected={p?.activity_level === a}
            onPress={() => updateProfile({ activity_level: a })}
          />
        ))}
      </View>
      {plan && !plan.ok ? (
        <Banner tone="danger" message={t(`onboarding.result.blocked.${plan.reason}`)} />
      ) : null}
      {plan?.ok ? (
        <Card style={styles.card}>
          <AppText>
            {t('onboarding.result.kcalA11y', { kcal: plan.plan.kcal })} ·{' '}
            {t('onboarding.result.tdee')}: {formatKcal(plan.plan.tdee)}
          </AppText>
          <GoalWarnings warnings={plan.plan.warnings} />
          <Button label={t('goals.recalculate')} icon="refresh" onPress={recalc} />
        </Card>
      ) : null}

      <SectionHeader title={t('goals.custom')} />
      <Card style={styles.card}>
        {(['protein', 'carbs', 'fat'] as const).map((k) => (
          <Controller
            key={k}
            control={control}
            name={k}
            render={({ field }) => (
              <TextField
                label={t(`macros.${k}`)}
                suffix="g"
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
        ))}
        <Controller
          control={control}
          name="water"
          render={({ field }) => (
            <TextField
              label={t('today.water')}
              suffix="ml"
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        <Button
          label={t('common.save')}
          onPress={saveManual}
          loading={formState.isSubmitting}
          variant="secondary"
        />
      </Card>
      <Banner tone="info" message={t('common.disclaimer')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
