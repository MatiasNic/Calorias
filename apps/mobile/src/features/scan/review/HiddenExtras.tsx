import type { MealItem } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip } from '@/components';
import { HIDDEN_EXTRAS } from '@/features/diary/cooking';
import { useDraftStore } from '@/features/diary/draftStore';
import { makeItem } from '@/features/diary/mealMath';
import { getRegionalFood } from '@/features/foods/search';
import { spacing } from '@/theme';

/** Toggle chips for easy-to-forget extras (oil, sauces, sugar…). */
export function HiddenExtras({ items }: { items: MealItem[] }) {
  const { t } = useTranslation();
  const addItem = useDraftStore((s) => s.addItem);
  const removeItem = useDraftStore((s) => s.removeItem);
  return (
    <View style={styles.extras}>
      <AppText variant="bodyStrong">{t('review.hiddenTitle')}</AppText>
      <View style={styles.chips}>
        {HIDDEN_EXTRAS.map((x) => {
          const food = getRegionalFood(x.id);
          if (!food) return null;
          const added = items.findIndex((i) => i.food_id === x.id);
          return (
            <Chip
              key={x.id}
              icon={added >= 0 ? 'check' : 'add'}
              selected={added >= 0}
              label={t(`review.extras.${x.key}`)}
              onPress={() =>
                added >= 0
                  ? removeItem(added)
                  : addItem({ ...makeItem(food, x.grams), user_edited: true })
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  extras: { gap: spacing.sm, paddingTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
