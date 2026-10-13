import { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { DictateButton } from './DictateButton';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  suffix?: string;
  /** Mic to dictate into the field. Defaults to on for free text (not numbers, email, passwords). */
  dictation?: boolean;
}

const NO_DICTATION = /email|password|username|tel|postal|cc-|one-time-code/;

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, suffix, style, dictation, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const freeText =
    !rest.secureTextEntry &&
    (rest.keyboardType == null || rest.keyboardType === 'default') &&
    !NO_DICTATION.test(rest.autoComplete ?? '') &&
    !NO_DICTATION.test(rest.textContentType ?? '');
  const canDictate =
    (dictation ?? freeText) && typeof rest.value === 'string' && !!rest.onChangeText;
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" color="textMuted">
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.6}
          style={[
            styles.input,
            { color: colors.text },
            Platform.OS === 'web' && styles.noOutline,
            style,
          ]}
          {...rest}
        />
        {suffix ? (
          <AppText variant="label" color="textMuted">
            {suffix}
          </AppText>
        ) : null}
        {canDictate ? (
          <DictateButton value={rest.value ?? ''} onChangeText={rest.onChangeText!} size={36} />
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    gap: spacing.xs,
    minHeight: 52,
  },
  noOutline: { outlineStyle: 'none' } as object,
  input: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 15, paddingVertical: spacing.sm },
});
