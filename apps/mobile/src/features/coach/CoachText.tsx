import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components';
import type { ThemeColors } from '@/theme';
import { fontFamily, spacing } from '@/theme';
import { boldRuns } from './logic';

/** The coach's text: paragraphs, "- " bullets and **bold** (the only markup it is told to use). */
export function CoachText({ text, color }: { text: string; color: keyof ThemeColors }) {
  const lines = text.split('\n').map((l) => l.trimEnd());
  return (
    <View style={styles.wrap}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={styles.gap} />;
        const bullet = /^\s*[-•*]\s+/.test(line);
        const body = bullet ? line.replace(/^\s*[-•*]\s+/, '') : line;
        const text = (
          <AppText color={color} selectable style={bullet ? styles.flex : undefined}>
            {boldRuns(body).map(([run, bold], j) => (
              <AppText key={j} color={color} style={bold ? styles.bold : undefined}>
                {run}
              </AppText>
            ))}
          </AppText>
        );
        return bullet ? (
          <View key={i} style={styles.bullet}>
            <AppText color={color}>•</AppText>
            {text}
          </View>
        ) : (
          <View key={i}>{text}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  gap: { height: spacing.xs },
  bullet: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.xs },
  flex: { flex: 1 },
  bold: { fontFamily: fontFamily.bold },
});
