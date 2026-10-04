import type { IsoDate, MealType } from '@plato/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, IconButton, toast } from '@/components';
import { repeatFromYesterday } from '@/features/diary/hooks';
import type { MealRecord } from '@/services/db/types';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { MealRow } from './MealRow';

export function MealSection({
  type,
  meals,
  date,
}: {
  type: MealType;
  meals: MealRecord[];
  date: IsoDate;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const kcal = meals.reduce((s, m) => s + m.totals.kcal, 0);
  const label = t(`mealTypes.${type}`);

  const repeat = async () => {
    const n = await repeatFromYesterday(date, type);
    if (n) toast.success(t('diary.repeated', { count: n }));
    else toast.info(t('diary.nothingYesterday'));
  };

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="subheading" accessibilityRole="header">
            {label}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {meals.length ? `${formatKcal(kcal)} kcal` : t('diary.empty')}
          </AppText>
        </View>
        {!meals.length ? (
          <IconButton
            icon="repeat"
            accessibilityLabel={t('diary.repeatYesterday', { meal: label })}
            onPress={repeat}
            color="textMuted"
            size={20}
          />
        ) : null}
        <IconButton
          icon="add-circle"
          accessibilityLabel={t('diary.addTo', { meal: label })}
          color="primary"
          size={28}
          testID={`add-${type}`}
          onPress={() =>
            router.push({ pathname: '/food-search', params: { mealType: type, date } })
          }
        />
      </View>
      {meals.map((m, i) => (
        <View
          key={m.id}
          style={i > 0 ? [styles.divider, { borderTopColor: colors.border }] : undefined}
        >
          <MealRow meal={m} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
});
