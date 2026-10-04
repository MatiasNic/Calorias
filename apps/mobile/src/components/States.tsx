import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radii, spacing, useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={34} color="primary" />
      </View>
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textMuted" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          fullWidth={false}
          size="md"
        />
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={[styles.badge, { backgroundColor: colors.dangerSoft }]}>
        <Icon name="cloud-offline-outline" size={34} color="danger" />
      </View>
      <AppText variant="subheading" align="center">
        {t('common.errorTitle')}
      </AppText>
      <AppText variant="body" color="textMuted" align="center">
        {message ?? t('common.errorMessage')}
      </AppText>
      {onRetry ? (
        <Button
          label={t('common.retry')}
          onPress={onRetry}
          variant="secondary"
          fullWidth={false}
          size="md"
          icon="refresh"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  badge: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
