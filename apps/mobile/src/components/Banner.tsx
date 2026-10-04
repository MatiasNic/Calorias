import { StyleSheet, View } from 'react-native';

import { radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface BannerProps {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  message: string;
  icon?: IconName;
}

export function Banner({ tone = 'info', title, message, icon }: BannerProps) {
  const { colors } = useTheme();
  const cfg = {
    info: { bg: colors.primarySoft, fg: 'primary' as const, icon: 'information-circle' as const },
    success: { bg: colors.successSoft, fg: 'success' as const, icon: 'checkmark-circle' as const },
    warning: { bg: colors.warningSoft, fg: 'warning' as const, icon: 'alert-circle' as const },
    danger: { bg: colors.dangerSoft, fg: 'danger' as const, icon: 'warning' as const },
  }[tone];
  return (
    <View
      style={[styles.wrap, { backgroundColor: cfg.bg }]}
      accessibilityRole={tone === 'danger' ? 'alert' : 'text'}
    >
      <Icon name={icon ?? cfg.icon} size={20} color={cfg.fg} />
      <View style={styles.text}>
        {title ? <AppText variant="bodyStrong">{title}</AppText> : null}
        <AppText variant="label" color="text">
          {message}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'flex-start',
  },
  text: { flex: 1, gap: 2 },
});
