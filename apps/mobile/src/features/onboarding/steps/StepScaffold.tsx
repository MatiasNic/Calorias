import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { AppText } from '@/components';
import { spacing } from '@/theme';

export function StepScaffold({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <Animated.View entering={FadeInRight.duration(250)} style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  header: { gap: spacing.xs },
});
