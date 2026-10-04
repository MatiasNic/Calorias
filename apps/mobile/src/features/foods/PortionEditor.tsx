import { PORTION_MULTIPLIERS } from '@plato/shared';
import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, Stepper } from '@/components';
import type { Serving } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { formatGrams } from '@/utils/format';

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

export function PortionEditor({
  grams,
  onChange,
  servings = [],
  baseGrams,
  label,
}: PortionEditorProps) {
  const { colors } = useTheme();
  const servingLabel = useServingLabel();
  const base = baseGrams && baseGrams > 0 ? baseGrams : 100;
  const max = Math.max(500, Math.ceil((base * 3) / 50) * 50, grams);
  return (
    <View style={styles.wrap}>
      <Stepper
        label={label}
        value={grams}
        onChange={onChange}
        step={grams >= 200 ? 25 : 10}
        min={0}
        max={5000}
        unit="g"
      />
      <Slider
        accessibilityLabel={label}
        minimumValue={0}
        maximumValue={max}
        step={5}
        value={grams}
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
            onPress={() => onChange(Math.round(base * m))}
          />
        ))}
      </View>
      {servings.length ? (
        <View style={styles.chips}>
          {servings.map((s) => (
            <Chip
              key={`${s.unit}-${s.grams}`}
              icon="restaurant-outline"
              label={servingLabel(s)}
              selected={s.grams === grams}
              onPress={() => onChange(s.grams)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
