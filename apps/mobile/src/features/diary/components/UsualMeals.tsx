import { addDays, FREQUENT_MEALS, frequentMeals, type IsoDate } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, toast } from '@/components';
import { repos } from '@/services/db/repository';
import { track } from '@/services/analytics';
import { fontFamily, spacing, useTheme } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';
import { haptic } from '@/utils/haptics';
import { duplicateMeal } from '../hooks';
import { MEAL_ICONS } from '../mealIcons';

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
  // Meals added from here in this visit show a check (the card stays, for another serving).
  const [added, setAdded] = useState<string[]>([]);
  if (!usual.data?.length) return null;

  const log = async (key: string) => {
    const entry = usual.data?.find((u) => u.key === key);
    if (!entry || busy) return;
    setBusy(key);
    try {
      await duplicateMeal(entry.record, date, entry.mealType);
      haptic('success');
      setAdded((a) => [...a, key]);
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
      <View style={styles.titleRow}>
        <AppText variant="bodyStrong" style={styles.title}>
          {t('usual.title')}
        </AppText>
        <AppText variant="caption" color="textSubtle">
          {t('usual.subtitle')}
        </AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.row}
      >
        {usual.data.map((u) => {
          const names = u.record.items.map((i) => i.display_name).join(', ');
          const done = added.includes(u.key);
          return (
            <Pressable
              key={u.key}
              accessibilityRole="button"
              accessibilityState={{ selected: done }}
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
                  backgroundColor: colors.surface,
                  borderColor: done ? colors.text : 'transparent',
                  opacity: pressed ? 0.8 : busy && busy !== u.key ? 0.5 : 1,
                },
              ]}
              testID={`usual-${u.key}`}
            >
              <View style={styles.cardHead}>
                <Icon name={MEAL_ICONS[u.mealType]} size={16} color="textMuted" />
                <AppText variant="caption" color="textMuted" style={styles.meal}>
                  {t(`mealTypes.${u.mealType}`)}
                </AppText>
              </View>
              <AppText variant="bodyStrong" numberOfLines={2} style={styles.name}>
                {names}
              </AppText>
              <View style={styles.foot}>
                <AppText variant="caption" color="textMuted" tabular>
                  {formatKcal(u.record.totals.kcal)} kcal
                </AppText>
                <View
                  style={[
                    styles.add,
                    { backgroundColor: done ? colors.primary : colors.surfaceAlt },
                  ]}
                >
                  <Icon
                    name={busy === u.key ? 'hourglass_empty' : done ? 'check' : 'add'}
                    size={20}
                    color={done ? 'onPrimary' : 'text'}
                  />
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontFamily: fontFamily.extrabold },
  // The carousel runs to the screen edges (the screen has 20 px side padding).
  bleed: { marginHorizontal: -spacing.xl },
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  card: {
    width: 168,
    gap: spacing.sm,
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 22,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  meal: { fontFamily: fontFamily.bold, fontSize: 12 },
  name: { fontSize: 15, lineHeight: 19.5, minHeight: 39 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  add: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
