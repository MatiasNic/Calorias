import { addDays, FREQUENT_MEALS, frequentMeals, type IsoDate } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, toast } from '@/components';
import { repos } from '@/services/db/repository';
import { track } from '@/services/analytics';
import { radii, spacing, useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { duplicateMeal } from '../hooks';

/** Meals of the last weeks, for "Lo de siempre". */
export function useUsualMeals() {
  return useQuery({
    queryKey: ['db', 'meals', 'usual'],
    queryFn: async () => {
      const today = todayLocal();
      const records = await repos.meals.list({
        from: addDays(today, -FREQUENT_MEALS.windowDays),
        to: today,
      });
      const usual = frequentMeals(
        records.map((r) => ({
          id: r.id,
          mealType: r.meal_type,
          eatenAt: r.eaten_at,
          items: r.items,
        })),
        new Date(),
      );
      return usual.map((u) => ({ ...u, record: records.find((r) => r.id === u.latest.id)! }));
    },
  });
}

/** "Lo de siempre": the meals the user repeats, logged again with one tap. */
export function UsualMeals({ date }: { date: IsoDate }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const usual = useUsualMeals();
  const [busy, setBusy] = useState<string | null>(null);
  if (!usual.data?.length) return null;

  const log = async (key: string) => {
    const entry = usual.data?.find((u) => u.key === key);
    if (!entry || busy) return;
    setBusy(key);
    try {
      await duplicateMeal(entry.record, date, entry.mealType);
      haptic('success');
      track('usual_meal_logged', { items: entry.record.items.length });
      toast.success(t('usual.logged', { meal: t(`mealTypes.${entry.mealType}`).toLowerCase() }));
    } catch {
      toast.error(t('common.errorMessage'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textMuted" style={styles.title}>
        {t('usual.title')}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {usual.data.map((u) => {
          const names = u.record.items.map((i) => i.display_name).join(', ');
          return (
            <Pressable
              key={u.key}
              accessibilityRole="button"
              accessibilityLabel={t('usual.a11y', {
                foods: names,
                meal: t(`mealTypes.${u.mealType}`),
                kcal: Math.round(u.record.totals.kcal),
              })}
              disabled={!!busy}
              onPress={() => log(u.key)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                  opacity: busy && busy !== u.key ? 0.5 : 1,
                },
              ]}
              testID={`usual-${u.key}`}
            >
              <View style={styles.cardHead}>
                <AppText variant="caption" color="textMuted">
                  {t(`mealTypes.${u.mealType}`)}
                </AppText>
                <Icon
                  name={busy === u.key ? 'hourglass-outline' : 'add-circle'}
                  size={20}
                  color="primary"
                />
              </View>
              <AppText variant="label" numberOfLines={2}>
                {names}
              </AppText>
              <AppText variant="caption" color="textMuted" tabular>
                {formatKcal(u.record.totals.kcal)} kcal
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { paddingHorizontal: spacing.xs },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  card: {
    width: 168,
    minHeight: 104,
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radii.xl,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
