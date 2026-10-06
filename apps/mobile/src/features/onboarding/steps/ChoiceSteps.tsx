import type { ActivityLevel, DietaryPreference, GoalType, Sex } from '@plato/shared';
import { DietaryPreferenceSchema } from '@plato/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Chip, OptionCard, TextField, type IconName } from '@/components';
import { spacing } from '@/theme';
import { useOnboardingStore } from '../store';
import { StepScaffold } from './StepScaffold';

export function GoalStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const options: { value: GoalType; icon: IconName }[] = [
    { value: 'lose', icon: 'trending-down' },
    { value: 'maintain', icon: 'swap-horizontal' },
    { value: 'gain', icon: 'trending-up' },
    { value: 'build_muscle', icon: 'barbell' },
    { value: 'eat_healthier', icon: 'leaf' },
  ];
  return (
    <StepScaffold title={t('onboarding.goal.title')} subtitle={t('onboarding.goal.subtitle')}>
      <View style={styles.list} accessibilityRole="radiogroup">
        {options.map((o) => (
          <OptionCard
            key={o.value}
            testID={`goal-${o.value}`}
            icon={o.icon}
            title={t(`onboarding.goal.options.${o.value}.title`)}
            description={t(`onboarding.goal.options.${o.value}.description`)}
            selected={answers.goal === o.value}
            onPress={() => {
              if (o.value === answers.goal) return;
              // Rate and target belong to a direction (lose/gain); don't carry them across.
              const sameDirection = goalDirection(o.value) === goalDirection(answers.goal);
              set({
                goal: o.value,
                weeklyRateKg: sameDirection ? answers.weeklyRateKg : null,
                targetWeightKg: sameDirection ? answers.targetWeightKg : null,
              });
            }}
          />
        ))}
      </View>
    </StepScaffold>
  );
}

export function SexStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const options: Sex[] = ['female', 'male'];
  return (
    <StepScaffold title={t('onboarding.sex.title')} subtitle={t('onboarding.sex.subtitle')}>
      <View style={styles.list} accessibilityRole="radiogroup">
        {options.map((o) => (
          <OptionCard
            key={o}
            testID={`sex-${o}`}
            title={t(`onboarding.sex.${o}`)}
            selected={answers.sex === o}
            onPress={() => set({ sex: o })}
          />
        ))}
      </View>
    </StepScaffold>
  );
}

export function ActivityStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const options: { value: ActivityLevel; icon: IconName }[] = [
    { value: 'sedentary', icon: 'desktop-outline' },
    { value: 'light', icon: 'walk' },
    { value: 'moderate', icon: 'bicycle' },
    { value: 'active', icon: 'fitness' },
    { value: 'very_active', icon: 'flame' },
  ];
  return (
    <StepScaffold
      title={t('onboarding.activity.title')}
      subtitle={t('onboarding.activity.subtitle')}
    >
      <View style={styles.list} accessibilityRole="radiogroup">
        {options.map((o) => (
          <OptionCard
            key={o.value}
            testID={`activity-${o.value}`}
            icon={o.icon}
            title={t(`onboarding.activity.options.${o.value}.title`)}
            description={t(`onboarding.activity.options.${o.value}.description`)}
            selected={answers.activity === o.value}
            onPress={() => set({ activity: o.value })}
          />
        ))}
      </View>
    </StepScaffold>
  );
}

export const LOSS_RATES = [0.25, 0.5, 0.75, 1] as const;
/** -1 lose, +1 gain, 0 neither. */
export function goalDirection(goal: string | null | undefined): -1 | 0 | 1 {
  return goal === 'lose' ? -1 : goal === 'gain' || goal === 'build_muscle' ? 1 : 0;
}

export const GAIN_RATES = [0.1, 0.25, 0.5] as const;

export function RateStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const losing = answers.goal === 'lose';
  const rates = losing ? LOSS_RATES : GAIN_RATES;
  const recommended = losing ? 0.5 : 0.25;
  const weight = answers.weightKg ?? 70;
  const aggressive = losing && (answers.weeklyRateKg ?? 0) > weight * 0.0075;
  return (
    <StepScaffold
      title={t('onboarding.rate.title')}
      subtitle={t(losing ? 'onboarding.rate.subtitleLose' : 'onboarding.rate.subtitleGain')}
    >
      <View style={styles.list} accessibilityRole="radiogroup">
        {rates.map((r) => (
          <OptionCard
            key={r}
            testID={`rate-${r}`}
            title={t('onboarding.rate.perWeek', { value: r.toLocaleString() })}
            description={t(
              `onboarding.rate.pace.${r <= (losing ? 0.25 : 0.1) ? 'slow' : r === recommended ? 'recommended' : r >= (losing ? 0.75 : 0.5) ? 'fast' : 'steady'}`,
            )}
            badge={r === recommended ? t('onboarding.rate.recommended') : undefined}
            selected={answers.weeklyRateKg === r}
            onPress={() => set({ weeklyRateKg: r })}
          />
        ))}
      </View>
      {aggressive ? (
        <Banner
          tone="warning"
          title={t('onboarding.rate.aggressiveTitle')}
          message={t('onboarding.rate.aggressiveMessage')}
        />
      ) : null}
    </StepScaffold>
  );
}

export function DietStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const [allergyText, setAllergyText] = useState('');
  const toggle = (p: DietaryPreference) =>
    set({
      dietaryPreferences: answers.dietaryPreferences.includes(p)
        ? answers.dietaryPreferences.filter((x) => x !== p)
        : [...answers.dietaryPreferences, p],
    });
  const addAllergy = () => {
    const v = allergyText.trim();
    if (v && !answers.allergies.includes(v)) set({ allergies: [...answers.allergies, v] });
    setAllergyText('');
  };
  return (
    <StepScaffold title={t('onboarding.diet.title')} subtitle={t('onboarding.diet.subtitle')}>
      <View style={styles.chips}>
        {DietaryPreferenceSchema.options.map((p) => (
          <Chip
            key={p}
            label={t(`diet.${p}`)}
            selected={answers.dietaryPreferences.includes(p)}
            onPress={() => toggle(p)}
          />
        ))}
      </View>
      <AppText variant="subheading">{t('onboarding.diet.allergiesTitle')}</AppText>
      <TextField
        placeholder={t('onboarding.diet.allergiesPlaceholder')}
        value={allergyText}
        onChangeText={setAllergyText}
        onSubmitEditing={addAllergy}
        returnKeyType="done"
        accessibilityLabel={t('onboarding.diet.allergiesTitle')}
      />
      <View style={styles.chips}>
        {answers.allergies.map((a) => (
          <Chip
            key={a}
            label={`${a}  ✕`}
            selected
            onPress={() => set({ allergies: answers.allergies.filter((x) => x !== a) })}
          />
        ))}
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
