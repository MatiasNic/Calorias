import { ageFromBirthDate, SAFETY } from '@plato/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, IconButton, ProgressBar, Screen, toast } from '@/components';
import { finishOnboarding } from '@/features/onboarding/finish';
import { captureError } from '@/services/analytics';
import { planFromAnswers } from '@/features/onboarding/plan';
import {
  BirthStep,
  HeightStep,
  TargetStep,
  WeightStep,
} from '@/features/onboarding/steps/BodySteps';
import {
  ActivityStep,
  DietStep,
  GoalStep,
  RateStep,
  SexStep,
} from '@/features/onboarding/steps/ChoiceSteps';
import { PermissionsStep } from '@/features/onboarding/steps/PermissionsStep';
import { ResultStep } from '@/features/onboarding/steps/ResultStep';
import {
  birthDateIso,
  stepsFor,
  useOnboardingStore,
  type OnboardingAnswers,
  type StepId,
} from '@/features/onboarding/store';
import { PaywallContent } from '@/features/premium/PaywallContent';
import { spacing } from '@/theme';

function canContinue(step: StepId, a: OnboardingAnswers): boolean {
  switch (step) {
    case 'goal':
      return !!a.goal;
    case 'sex':
      return !!a.sex;
    case 'birth': {
      const iso = birthDateIso(a);
      return (
        !!iso && ageFromBirthDate(iso) >= SAFETY.minAge && ageFromBirthDate(iso) <= SAFETY.maxAge
      );
    }
    case 'height':
      return !!a.heightCm;
    case 'weight':
      return !!a.weightKg;
    case 'target':
      return !!a.targetWeightKg;
    case 'activity':
      return !!a.activity;
    case 'rate':
      return a.weeklyRateKg != null;
    case 'result': {
      const r = planFromAnswers(a);
      return !!r && r.ok;
    }
    default:
      return true;
  }
}

const STEP_VIEWS: Record<Exclude<StepId, 'paywall'>, () => React.JSX.Element> = {
  goal: GoalStep,
  sex: SexStep,
  birth: BirthStep,
  height: HeightStep,
  weight: WeightStep,
  target: TargetStep,
  activity: ActivityStep,
  rate: RateStep,
  diet: DietStep,
  result: ResultStep,
  permissions: PermissionsStep,
};

export default function Onboarding() {
  const { t } = useTranslation();
  const { answers, stepIndex, goTo, reset } = useOnboardingStore();
  const [saving, setSaving] = useState(false);
  const steps = stepsFor(answers.goal);
  const index = Math.min(stepIndex, steps.length - 1);
  const step = steps[index]!;

  const back = useCallback(() => {
    if (index > 0) goTo(index - 1);
    return true;
  }, [index, goTo]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', back);
      return () => sub.remove();
    }, [back]),
  );

  const finish = async () => {
    const result = planFromAnswers(answers);
    if (!result?.ok) return;
    setSaving(true);
    try {
      await finishOnboarding(answers, result.plan);
      reset();
      router.replace('/today');
    } catch (e) {
      captureError(e, { where: 'finishOnboarding' });
      toast.error(t('common.errorMessage'));
    } finally {
      setSaving(false);
    }
  };

  if (step === 'paywall') {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <PaywallContent context="onboarding" onClose={() => finish()} />
      </Screen>
    );
  }

  const StepView = STEP_VIEWS[step];
  const result = step === 'result' ? planFromAnswers(answers) : null;
  const blocked = step === 'result' && result != null && !result.ok;

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      keyboard
      footer={
        blocked ? (
          <Button
            label={t('onboarding.result.adjust')}
            variant="secondary"
            onPress={() => goTo(0)}
          />
        ) : (
          <Button
            label={step === 'result' ? t('onboarding.result.cta') : t('common.continue')}
            disabled={!canContinue(step, answers)}
            loading={saving}
            onPress={() => goTo(index + 1)}
            testID="onboarding-continue"
          />
        )
      }
    >
      <View style={styles.top}>
        <IconButton
          icon="arrow-back"
          accessibilityLabel={t('common.back')}
          onPress={back}
          disabled={index === 0}
        />
        <View style={styles.flex}>
          <ProgressBar
            progress={(index + 1) / steps.length}
            label={t('onboarding.progress', { current: index + 1, total: steps.length })}
          />
        </View>
        <AppText variant="caption" color="textMuted" tabular>
          {index + 1}/{steps.length}
        </AppText>
      </View>
      <StepView key={step} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
