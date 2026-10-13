import type { IsoDate } from '@bocado/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, IconButton } from '@/components';
import { spacing } from '@/theme';
import { formatDay, todayLocal } from '@/utils/dates';

/** Close button, dish name and "day · N meals" (warning color when not today). */
export function ReviewHeader({
  title,
  date,
  mealCount,
  onClose,
}: {
  title: string | null;
  date: IsoDate;
  mealCount: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const subtitle = [
    date === todayLocal() ? t('common.today') : formatDay(date),
    t('review.mealsCount', { count: mealCount }),
  ].join(' · ');
  return (
    <View style={styles.header}>
      <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={onClose} />
      <View style={styles.flex}>
        <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
          {title ?? t('review.title')}
        </AppText>
        <AppText variant="caption" color={date !== todayLocal() ? 'warning' : 'textMuted'}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
  },
});
