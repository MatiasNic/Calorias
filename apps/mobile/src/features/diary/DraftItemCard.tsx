import type { MealItem } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Chip, ConfidenceBadge, Icon, IconButton } from '@/components';
import { PortionEditor } from '@/features/foods/PortionEditor';
import { getRegionalFood } from '@/features/foods/search';
import { radii, spacing, useTheme } from '@/theme';
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
  const step = item.grams >= 200 ? 25 : 10;
  const servings =
    item.food_source === 'regional' && item.food_id
      ? (getRegionalFood(item.food_id)?.servings ?? [])
      : [];

  return (
    <Animated.View layout={LinearTransition} entering={FadeIn}>
      <Card style={styles.card}>
        <View style={styles.headRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={t('review.itemA11y', {
              name: item.display_name,
              grams: Math.round(item.grams),
              kcal: Math.round(item.nutrients.kcal),
            })}
            accessibilityHint={t('review.moreOptions')}
            onPress={() => setOpen(!open)}
            style={styles.head}
            testID={`draft-item-${index}`}
          >
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={2}>
                {item.display_name}
              </AppText>
              {showConfidence && item.ai_confidence != null ? (
                <ConfidenceBadge confidence={item.ai_confidence} />
              ) : item.serving_unit ? (
                <AppText variant="caption" color="textMuted">
                  {item.serving_unit}
                </AppText>
              ) : null}
            </View>
            <AppText variant="number" tabular>
              {formatKcal(item.nutrients.kcal)}{' '}
              <AppText variant="caption" color="textMuted">
                kcal
              </AppText>
            </AppText>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} color="textSubtle" size={16} />
          </Pressable>
          {/* Removing is a one-tap action: wrong guesses and extras shouldn't need the editor. */}
          <IconButton
            icon="trash-outline"
            size={20}
            accessibilityLabel={t('review.removeNamed', { name: item.display_name })}
            color="danger"
            onPress={() => removeItem(index)}
            testID={`draft-remove-${index}`}
          />
        </View>
        <View style={styles.quick}>
          <View style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]}>
            <IconButton
              icon="remove"
              size={18}
              accessibilityLabel={t('review.less', { name: item.display_name })}
              onPress={() => setGrams(index, Math.max(1, Math.round(item.grams) - step))}
            />
            <AppText variant="bodyStrong" tabular style={styles.grams}>
              {Math.round(item.grams)} g
            </AppText>
            <IconButton
              icon="add"
              size={18}
              accessibilityLabel={t('review.more', { name: item.display_name })}
              onPress={() => setGrams(index, Math.round(item.grams) + step)}
            />
          </View>
          <AppText variant="caption" color="textMuted" tabular>
            P {Math.round(item.nutrients.protein_g)} · C {Math.round(item.nutrients.carbs_g)} · G{' '}
            {Math.round(item.nutrients.fat_g)}
          </AppText>
        </View>
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
            </View>
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', marginRight: -spacing.sm },
  head: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg },
  grams: { minWidth: 64, textAlign: 'center' },
  editor: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
