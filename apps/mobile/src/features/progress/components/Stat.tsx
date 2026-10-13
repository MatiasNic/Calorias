import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import { spacing } from '@/theme';

/** Small label/value pair used in the progress cards, with an optional color dot. */
export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular>
        {value}
      </AppText>
    </View>
  );
}

export const statStyles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
});

const styles = StyleSheet.create({
  stat: { flex: 1, gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
