import type { MealItem } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Chip, ConfidenceBadge, Icon, IconButton } from '@/components';
import { PortionEditor } from '@/features/foods/PortionEditor';
import { getRegionalFood } from '@/features/foods/search';
import { spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { applyCookingMethod, COOKING_CHOICES } from './cooking';
import { useDraftStore } from './draftStore';

export function DraftItemCard({
  item,
  index,
  baseGrams,
  showConfidence,
}: {
  item: MealItem;
  index: number;
  baseGrams?: number;
  showConfidence?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  // Multipliers apply to a fixed base (the AI estimate, or the grams when the card was opened).
  const [fixedBase] = useState(() => baseGrams ?? item.grams);
  const { setGrams, removeItem, updateItem } = useDraftStore();
  const servings =
    item.food_source === 'regional' && item.food_id
      ? (getRegionalFood(item.food_id)?.servings ?? [])
      : [];

  return (
    <Animated.View layout={LinearTransition} entering={FadeIn}>
      <Card style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={t('review.itemA11y', {
            name: item.display_name,
            grams: Math.round(item.grams),
            kcal: Math.round(item.nutrients.kcal),
          })}
          onPress={() => setOpen(!open)}
          style={styles.head}
          testID={`draft-item-${index}`}
        >
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {item.display_name}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {Math.round(item.grams)} g{item.serving_unit ? ` · ${item.serving_unit}` : ''}
            </AppText>
            <View style={styles.macros}>
              <AppText variant="caption" style={{ color: colors.protein }}>
                P {Math.round(item.nutrients.protein_g)}
              </AppText>
              <AppText variant="caption" style={{ color: colors.carbs }}>
                C {Math.round(item.nutrients.carbs_g)}
              </AppText>
              <AppText variant="caption" style={{ color: colors.fat }}>
                G {Math.round(item.nutrients.fat_g)}
              </AppText>
            </View>
          </View>
          <View style={styles.right}>
            <AppText variant="bodyStrong" tabular>
              {formatKcal(item.nutrients.kcal)} kcal
            </AppText>
            {showConfidence && item.ai_confidence != null ? (
              <ConfidenceBadge confidence={item.ai_confidence} />
            ) : null}
          </View>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} color="textMuted" size={18} />
        </Pressable>
        {open ? (
          <View style={styles.editor}>
            <PortionEditor
              label={t('review.grams', { name: item.display_name })}
              grams={Math.round(item.grams)}
              onChange={(g) => setGrams(index, g)}
              baseGrams={baseGrams ?? fixedBase}
              servings={servings}
            />
            {item.cooking_method ? (
              <View style={styles.chips}>
                {COOKING_CHOICES.map((m) => (
                  <Chip
                    key={m}
                    label={t(`cooking.${m}`)}
                    selected={item.cooking_method === m}
                    onPress={() =>
                      updateItem(index, { ...applyCookingMethod(item, m), user_edited: true })
                    }
                  />
                ))}
              </View>
            ) : null}
            <View style={styles.actions}>
              <IconButton
                icon="swap-horizontal"
                accessibilityLabel={t('review.changeFood')}
                color="primary"
                onPress={() =>
                  router.push({
                    pathname: '/food-search',
                    params: { target: 'draft', replace: String(index) },
                  })
                }
              />
              <AppText
                variant="label"
                color="primary"
                onPress={() =>
                  router.push({
                    pathname: '/food-search',
                    params: { target: 'draft', replace: String(index) },
                  })
                }
              >
                {t('review.changeFood')}
              </AppText>
              <View style={styles.flex} />
              <IconButton
                icon="trash"
                accessibilityLabel={t('review.removeItem')}
                color="danger"
                onPress={() => removeItem(index)}
                testID={`draft-remove-${index}`}
              />
            </View>
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  macros: { flexDirection: 'row', gap: spacing.sm },
  editor: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
