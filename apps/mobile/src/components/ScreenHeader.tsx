import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { spacing } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export function ScreenHeader({
  title,
  right,
  close,
}: {
  title: string;
  right?: ReactNode;
  close?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <IconButton
        icon={close ? 'close' : 'arrow-back'}
        accessibilityLabel={close ? t('common.close') : t('common.back')}
        onPress={() => router.back()}
      />
      <AppText variant="heading" style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: -spacing.sm },
  title: { flex: 1 },
});
