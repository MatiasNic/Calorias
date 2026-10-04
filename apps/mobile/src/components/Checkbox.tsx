import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, radii, spacing, useTheme } from '@/theme';
import { haptic } from '@/utils/haptics';
import { Icon } from './Icon';

export function Checkbox({
  checked,
  onChange,
  children,
  accessibilityLabel,
  testID,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  accessibilityLabel: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic('selection');
        onChange(!checked);
      }}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}
      >
        {checked ? <Icon name="checkmark" size={16} color="onPrimary" /> : null}
      </View>
      <View style={styles.text}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.sm - 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});
