import { StyleSheet, TextInput, View } from 'react-native';

import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';

export interface BigNumberInputProps {
  value: string;
  onChangeText: (v: string) => void;
  unit: string;
  accessibilityLabel: string;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  testID?: string;
}

/** Large centered numeric input used in onboarding and quick logs. */
export function BigNumberInput({
  value,
  onChangeText,
  unit,
  accessibilityLabel,
  placeholder,
  maxLength = 6,
  autoFocus,
  testID,
}: BigNumberInputProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
        maxFontSizeMultiplier={1.4}
        style={[styles.input, { color: colors.text }]}
      />
      <AppText variant="heading" color="textMuted">
        {unit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  input: {
    fontFamily: fontFamily.bold,
    fontSize: 44,
    minWidth: 90,
    textAlign: 'center',
    padding: 0,
  },
});
