import { Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { AppText } from './AppText';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** "strong": the selected option is ink on paper (review sizes); default: a recessed tab. */
  tone?: 'default' | 'strong';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  tone = 'default',
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrap, { backgroundColor: colors.surfaceAlt }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              haptic('selection');
              onChange(o.value);
            }}
            style={[
              styles.item,
              selected && {
                backgroundColor: tone === 'strong' ? colors.primary : colors.background,
              },
            ]}
          >
            <AppText
              variant="label"
              color={selected ? (tone === 'strong' ? 'onPrimary' : 'text') : 'textMuted'}
              numberOfLines={1}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: radii.md, padding: spacing.xs },
  item: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
  },
});
