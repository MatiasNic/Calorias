import { PORTION_MULTIPLIERS } from '@plato/shared';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, Stepper, TextField } from '@/components';
import type { Serving } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { formatGrams } from '@/utils/format';

/** Hard limits for a single food item, in grams and in household units. */
const MAX_GRAMS = 5000;
const MAX_UNITS = 50;

export interface PortionEditorProps {
  grams: number;
  onChange: (g: number) => void;
  servings?: Serving[];
  /** Base for multipliers (e.g. the AI estimate). Defaults to the current grams' first value. */
  baseGrams?: number;
  label: string;
}

export function useServingLabel() {
  const { t } = useTranslation();
  return (s: Serving) =>
    s.label ? s.label : `1 ${t(`units.${s.unit}` as 'units.unit')} (${formatGrams(s.grams)} g)`;
}

/**
 * Portion picker: household units ("2 tomatoes") when the food has servings, plus exact grams
 * (stepper, slider or typed), plus quick multipliers of the base portion.
 */
export function PortionEditor({
  grams,
  onChange,
  servings = [],
  baseGrams,
  label,
}: PortionEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const servingLabel = useServingLabel();
  const [servingIdx, setServingIdx] = useState(() => {
    const i = servings.findIndex(
      (s) =>
        s.grams > 0 && Math.abs(grams / s.grams - Math.round((grams / s.grams) * 2) / 2) < 0.01,
    );
    return i >= 0 ? i : 0;
  });
  const [typed, setTyped] = useState<string | null>(null);
  const serving = servings[servingIdx];
  const base = baseGrams && baseGrams > 0 ? baseGrams : 100;
  const sliderMax = Math.max(500, Math.ceil(Math.max(base * 3, grams * 1.5) / 50) * 50);
  const clampGrams = (g: number) => Math.max(0, Math.min(MAX_GRAMS, Math.round(g)));

  return (
    <View style={styles.wrap}>
      {serving && serving.grams > 0 ? (
        <>
          <AppText variant="label" color="textMuted">
            {t('portionEditor.units', { unit: servingLabel(serving) })}
          </AppText>
          <Stepper
            label={t('portionEditor.units', { unit: servingLabel(serving) })}
            value={Math.round((grams / serving.grams) * 2) / 2}
            onChange={(q) => onChange(clampGrams(q * serving.grams))}
            step={0.5}
            min={0.5}
            max={MAX_UNITS}
            format={(v) => v.toLocaleString()}
            unit={`× ${formatGrams(serving.grams)} g`}
          />
          {servings.length > 1 ? (
            <View style={styles.chips}>
              {servings.map((s, i) => (
                <Chip
                  key={`${s.unit}-${s.grams}`}
                  icon="restaurant-outline"
                  label={servingLabel(s)}
                  selected={i === servingIdx}
                  onPress={() => {
                    setServingIdx(i);
                    onChange(clampGrams(s.grams));
                  }}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      <Stepper
        label={label}
        value={grams}
        onChange={onChange}
        step={grams >= 200 ? 25 : 10}
        min={0}
        max={MAX_GRAMS}
        unit="g"
      />
      <TextField
        label={t('portionEditor.exactGrams')}
        keyboardType="numeric"
        inputMode="numeric"
        suffix="g"
        value={typed ?? String(grams)}
        onChangeText={(v) => {
          const clean = v.replace(/[^\d]/g, '');
          setTyped(clean);
          if (clean) onChange(clampGrams(Number(clean)));
        }}
        onBlur={() => setTyped(null)}
      />
      <Slider
        accessibilityLabel={label}
        minimumValue={0}
        maximumValue={sliderMax}
        step={5}
        value={Math.min(grams, sliderMax)}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.ringTrack}
        thumbTintColor={colors.primary}
      />
      <View style={styles.chips}>
        {PORTION_MULTIPLIERS.map((m) => (
          <Chip
            key={m}
            label={`${m.toLocaleString()}×`}
            selected={Math.round(base * m) === grams}
            onPress={() => onChange(clampGrams(base * m))}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
