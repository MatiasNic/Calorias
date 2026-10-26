import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
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
  /** Tapping the value (e.g. to pick a time directly); adds a hint for screen readers. */
  onPressValue?: () => void;
  valueHint?: string;
}

/** Hold − or +: repeats after a short delay, faster the longer it's held. */
const REPEAT = { firstMs: 220, minMs: 50, factor: 0.85 } as const;

export function Stepper({
  value,
  onChange,
  step = 10,
  min = 0,
  max = 5000,
  unit,
  label,
  format,
  onPressValue,
  valueHint,
}: StepperProps) {
  const { colors } = useTheme();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  // Repeats run ahead of the parent's re-render, so they keep their own running value.
  const current = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    current.current = value;
  }, [value]);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const hold = (dir: 1 | -1) => {
    stop();
    let wait: number = REPEAT.firstMs;
    const tick = () => {
      const next = clamp(current.current + dir * step);
      if (next === current.current) return stop();
      current.current = next;
      onChange(next);
      haptic('selection');
      wait = Math.max(REPEAT.minMs, wait * REPEAT.factor);
      timer.current = setTimeout(tick, wait);
    };
    tick();
  };

  const text = (
    <AppText variant="subheading" tabular style={styles.value}>
      {format ? format(value) : value}
      {unit ? <AppText variant="label" color="textMuted">{` ${unit}`}</AppText> : null}
    </AppText>
  );

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]}
      accessible={!onPressValue}
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
        onLongPress={() => hold(-1)}
        onPressOut={stop}
        disabled={value <= min}
      />
      {onPressValue ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${format ? format(value) : value}`}
          accessibilityHint={valueHint}
          onPress={onPressValue}
          hitSlop={6}
          testID="stepper-value"
          style={({ pressed }) => [styles.valueButton, pressed && styles.pressed]}
        >
          {text}
        </Pressable>
      ) : (
        text
      )}
      <IconButton
        icon="add"
        accessibilityLabel={`+ ${step}`}
        onPress={() => onChange(clamp(value + step))}
        onLongPress={() => hold(1)}
        onPressOut={stop}
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
  valueButton: { minHeight: 48, justifyContent: 'center', borderRadius: radii.md },
  pressed: { opacity: 0.6 },
});
