import {
  ageFromBirthDate,
  bmi,
  cmToFtIn,
  ftInToCm,
  kgToLb,
  lbToKg,
  SAFETY,
  type UnitSystem,
} from '@plato/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, BigNumberInput, SegmentedControl, TextField } from '@/components';
import { usePrefsStore } from '@/stores/prefs';
import { spacing } from '@/theme';
import { formatNumber, parseDecimal } from '@/utils/format';
import { birthDateIso, useOnboardingStore } from '../store';
import { StepScaffold } from './StepScaffold';

function UnitToggle() {
  const { t } = useTranslation();
  const units = usePrefsStore((s) => s.units);
  const setPrefs = usePrefsStore((s) => s.set);
  return (
    <SegmentedControl<UnitSystem>
      accessibilityLabel={t('settings.units')}
      value={units}
      onChange={(v) => setPrefs({ units: v })}
      options={[
        { value: 'metric', label: t('settings.metric') },
        { value: 'imperial', label: t('settings.imperial') },
      ]}
    />
  );
}

export function BirthStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const iso = birthDateIso(answers);
  const age = iso ? ageFromBirthDate(iso) : null;
  return (
    <StepScaffold title={t('onboarding.birth.title')} subtitle={t('onboarding.birth.subtitle')}>
      <View style={styles.row}>
        <View style={styles.small}>
          <TextField
            label={t('onboarding.birth.day')}
            keyboardType="number-pad"
            maxLength={2}
            value={answers.birthDay}
            onChangeText={(v) => set({ birthDay: v.replace(/\D/g, '') })}
            testID="birth-day"
          />
        </View>
        <View style={styles.small}>
          <TextField
            label={t('onboarding.birth.month')}
            keyboardType="number-pad"
            maxLength={2}
            value={answers.birthMonth}
            onChangeText={(v) => set({ birthMonth: v.replace(/\D/g, '') })}
            testID="birth-month"
          />
        </View>
        <View style={styles.large}>
          <TextField
            label={t('onboarding.birth.year')}
            keyboardType="number-pad"
            maxLength={4}
            value={answers.birthYear}
            onChangeText={(v) => set({ birthYear: v.replace(/\D/g, '') })}
            testID="birth-year"
          />
        </View>
      </View>
      {age != null ? (
        <AppText color="textMuted" align="center">
          {t('onboarding.birth.age', { count: age })}
        </AppText>
      ) : null}
      {age != null && age < SAFETY.minAge ? (
        <Banner tone="danger" message={t('onboarding.birth.tooYoung', { age: SAFETY.minAge })} />
      ) : null}
      {age != null && age >= SAFETY.minAge && age < SAFETY.minAgeForDeficit ? (
        <Banner tone="warning" message={t('onboarding.birth.minor')} />
      ) : null}
    </StepScaffold>
  );
}

export function HeightStep() {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const units = usePrefsStore((s) => s.units);
  const initial = answers.heightCm ? cmToFtIn(answers.heightCm) : null;
  const [cm, setCm] = useState(answers.heightCm ? String(Math.round(answers.heightCm)) : '');
  const [ft, setFt] = useState(initial ? String(initial.ft) : '');
  const [inch, setInch] = useState(initial ? String(initial.inches) : '');

  const updateMetric = (v: string) => {
    setCm(v);
    const n = parseDecimal(v);
    set({ heightCm: n && n >= 100 && n <= 250 ? n : null });
  };
  const updateImperial = (f: string, i: string) => {
    setFt(f);
    setInch(i);
    const nf = parseDecimal(f);
    const ni = parseDecimal(i || '0');
    const total = nf != null && ni != null ? ftInToCm(nf, ni) : null;
    set({ heightCm: total && total >= 100 && total <= 250 ? Math.round(total * 10) / 10 : null });
  };

  return (
    <StepScaffold title={t('onboarding.height.title')}>
      <UnitToggle />
      {units === 'metric' ? (
        <BigNumberInput
          value={cm}
          onChangeText={updateMetric}
          unit="cm"
          accessibilityLabel={t('onboarding.height.title')}
          placeholder="170"
          maxLength={5}
          testID="height-input"
        />
      ) : (
        <View style={styles.row}>
          <View style={styles.half}>
            <BigNumberInput
              value={ft}
              onChangeText={(v) => updateImperial(v, inch)}
              unit="ft"
              accessibilityLabel="ft"
              placeholder="5"
              maxLength={1}
            />
          </View>
          <View style={styles.half}>
            <BigNumberInput
              value={inch}
              onChangeText={(v) => updateImperial(ft, v)}
              unit="in"
              accessibilityLabel="in"
              placeholder="7"
              maxLength={2}
            />
          </View>
        </View>
      )}
    </StepScaffold>
  );
}

function WeightInput({
  field,
  title,
  subtitle,
  testID,
}: {
  field: 'weightKg' | 'targetWeightKg';
  title: string;
  subtitle?: string;
  testID: string;
}) {
  const { t } = useTranslation();
  const { answers, set } = useOnboardingStore();
  const units = usePrefsStore((s) => s.units);
  const kg = answers[field];
  const [text, setText] = useState(
    kg ? formatNumber(units === 'imperial' ? kgToLb(kg) : kg, 1) : '',
  );
  const onChange = (v: string) => {
    setText(v);
    const n = parseDecimal(v);
    const asKg = n == null ? null : units === 'imperial' ? lbToKg(n) : n;
    set({ [field]: asKg && asKg >= 30 && asKg <= 350 ? Math.round(asKg * 10) / 10 : null });
  };
  return (
    <StepScaffold title={title} subtitle={subtitle}>
      <UnitToggle />
      <BigNumberInput
        value={text}
        onChangeText={onChange}
        unit={units === 'imperial' ? 'lb' : 'kg'}
        accessibilityLabel={title}
        placeholder={units === 'imperial' ? '160' : '70'}
        testID={testID}
      />
      {field === 'targetWeightKg' && kg && answers.heightCm ? (
        bmi(kg, answers.heightCm) < SAFETY.minHealthyBmi ? (
          <Banner
            tone="danger"
            title={t('onboarding.target.lowBmiTitle')}
            message={t('onboarding.target.lowBmiMessage')}
          />
        ) : (
          <AppText color="textMuted" align="center">
            {t('onboarding.target.bmi', { value: formatNumber(bmi(kg, answers.heightCm), 1) })}
          </AppText>
        )
      ) : null}
    </StepScaffold>
  );
}

export function WeightStep() {
  const { t } = useTranslation();
  return (
    <WeightInput
      field="weightKg"
      title={t('onboarding.weight.title')}
      subtitle={t('onboarding.weight.subtitle')}
      testID="weight-input"
    />
  );
}

export function TargetStep() {
  const { t } = useTranslation();
  return (
    <WeightInput
      field="targetWeightKg"
      title={t('onboarding.target.title')}
      subtitle={t('onboarding.target.subtitle')}
      testID="target-input"
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  small: { flex: 1 },
  large: { flex: 1.6 },
  half: { flex: 1 },
});
