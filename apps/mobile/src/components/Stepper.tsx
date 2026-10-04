import { StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
  format?: (v: number) => string;
}

export function Stepper({
  value,
  onChange,
  step = 10,
  min = 0,
  max = 5000,
  unit,
  label,
  format,
}: StepperProps) {
  const { colors } = useTheme();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${format ? format(value) : value} ${unit ?? ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(clamp(value + step));
        if (e.nativeEvent.actionName === 'decrement') onChange(clamp(value - step));
      }}
    >
      <IconButton
        icon="remove"
        accessibilityLabel={`− ${step}`}
        onPress={() => onChange(clamp(value - step))}
        disabled={value <= min}
      />
      <AppText variant="subheading" tabular style={styles.value}>
        {format ? format(value) : value}
        {unit ? <AppText variant="label" color="textMuted">{` ${unit}`}</AppText> : null}
      </AppText>
      <IconButton
        icon="add"
        accessibilityLabel={`+ ${step}`}
        onPress={() => onChange(clamp(value + step))}
        disabled={value >= max}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
  },
  value: { minWidth: 72, textAlign: 'center' },
});
