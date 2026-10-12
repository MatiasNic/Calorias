import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface BigNumberInputProps {
  value: string;
  onChangeText: (v: string) => void;
  unit: string;
  accessibilityLabel: string;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  testID?: string;
  /** Shows − / + buttons that move the value by this amount. */
  step?: number;
}

const parse = (v: string) => Number(v.replace(',', '.'));

/** Large centered number (76 pt) on a card, typed or nudged with − / +. Onboarding and weight. */
export function BigNumberInput({
  value,
  onChangeText,
  unit,
  accessibilityLabel,
  placeholder,
  maxLength = 6,
  autoFocus,
  testID,
  step,
}: BigNumberInputProps) {
  const { colors } = useTheme();
  const nudge = (dir: 1 | -1) => {
    const base = parse(value || placeholder || '0');
    if (!Number.isFinite(base) || !step) return;
    const next = Math.max(0, Math.round((base + dir * step) * 10) / 10);
    onChangeText(String(next).replace('.', ','));
  };
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      <View style={styles.value}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={accessibilityLabel}
          autoFocus={autoFocus}
          maxFontSizeMultiplier={1.3}
          style={[styles.input, { color: colors.text }, Platform.OS === 'web' && styles.noOutline]}
        />
        <AppText color="textMuted" style={styles.unit}>
          {unit}
        </AppText>
      </View>
      {step ? (
        <View style={styles.buttons}>
          <IconButton
            icon="remove"
            size={26}
            background="surfaceAlt"
            accessibilityLabel={`− ${step} ${unit}`}
            onPress={() => nudge(-1)}
          />
          <IconButton
            icon="add"
            size={26}
            background="surfaceAlt"
            accessibilityLabel={`+ ${step} ${unit}`}
            onPress={() => nudge(1)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radii.xxxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  input: {
    fontFamily: fontFamily.extrabold,
    fontSize: 76,
    letterSpacing: -3.4,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  noOutline: { outlineStyle: 'none' } as object,
  unit: { fontFamily: fontFamily.bold, fontSize: 22 },
  buttons: { flexDirection: 'row', gap: spacing.md },
});
