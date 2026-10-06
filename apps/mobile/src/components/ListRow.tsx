import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, spacing, useTheme, type ThemeColors } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: keyof ThemeColors;
  right?: ReactNode;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  testID?: string;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = 'text',
  right,
  value,
  onPress,
  chevron = !!onPress,
  destructive,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon ? (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={20} color={destructive ? 'danger' : iconColor} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={destructive ? 'danger' : 'text'} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="label" color="textMuted">
          {value}
        </AppText>
      ) : null}
      {right}
      {chevron ? <Icon name="chevron-forward" size={18} color="textSubtle" /> : null}
    </>
  );
  // A non-pressable row is a plain View so buttons inside it (`right`) stay interactive.
  if (!onPress) {
    return (
      <View testID={testID} style={styles.row}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  iconWrap: { width: 24, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
