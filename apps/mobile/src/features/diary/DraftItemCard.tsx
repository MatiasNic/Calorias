import { confidenceLevel, PORTION_SIZES, type MealItem } from '@plato/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, Icon, IconButton } from '@/components';
import { PortionEditor } from '@/features/foods/PortionEditor';
import { getRegionalFood } from '@/features/foods/search';
import { radii, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { applyCookingMethod, cookingChoicesFor } from './cooking';
import { useDraftStore } from './draftStore';

/**
 * One food of a meal being reviewed: a single line (name, portion, kcal) that expands into the
 * portion size, grams, cooking method and "change food". Removing stays one tap away.
 */
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
  const [fine, setFine] = useState(false);
  // Sizes apply to a fixed base (the AI estimate, or the grams when the card was mounted).
  const [fixedBase] = useState(() => baseGrams ?? item.grams);
  const base = baseGrams ?? fixedBase;
  const { setGrams, removeItem, updateItem } = useDraftStore();
  const step = item.grams >= 200 ? 25 : 10;
  const servings =
    item.food_source === 'regional' && item.food_id
      ? (getRegionalFood(item.food_id)?.servings ?? [])
      : [];
  const unsure = showConfidence && confidenceLevel(item.ai_confidence) === 'low';
  const portion = [item.serving_unit, `${Math.round(item.grams)} g`].filter(Boolean).join(' · ');

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn}
      style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.row}>
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
            <AppText variant="bodyStrong" numberOfLines={1}>
              {item.display_name}
            </AppText>
            <View style={styles.sub}>
              {unsure ? (
                <View style={[styles.dot, { backgroundColor: colors.confidenceLow }]} />
              ) : null}
              <AppText variant="caption" color={unsure ? 'warning' : 'textMuted'} numberOfLines={1}>
                {unsure ? `${portion} · ${t('review.checkPortion')}` : portion}
              </AppText>
            </View>
          </View>
          <AppText variant="bodyStrong" tabular>
            {formatKcal(item.nutrients.kcal)}
            <AppText variant="caption" color="textMuted">
              {' '}
              kcal
            </AppText>
          </AppText>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} color="textSubtle" size={16} />
        </Pressable>
        <IconButton
          icon="trash-outline"
          size={20}
          accessibilityLabel={t('review.removeNamed', { name: item.display_name })}
          color="textMuted"
          onPress={() => removeItem(index)}
          testID={`draft-remove-${index}`}
        />
      </View>
      {open ? (
        <View style={styles.details}>
          <View style={styles.chips}>
            {PORTION_SIZES.map((s) => (
              <Chip
                key={s.key}
                label={t(`review.size.${s.key}`)}
                selected={Math.round(base * s.factor) === Math.round(item.grams)}
                onPress={() => setGrams(index, Math.round(base * s.factor))}
              />
            ))}
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
          {item.cooking_method && item.cooking_method !== 'raw' ? (
            <View style={styles.chips}>
              {cookingChoicesFor(item).map((m) => (
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
          {fine ? (
            <PortionEditor
              label={t('review.grams', { name: item.display_name })}
              grams={Math.round(item.grams)}
              onChange={(g) => setGrams(index, g)}
              baseGrams={base}
              servings={servings}
            />
          ) : null}
          <View style={styles.links}>
            <AppText
              variant="label"
              color="primary"
              accessibilityRole="button"
              onPress={() => setFine(!fine)}
              style={styles.link}
            >
              {fine ? t('review.lessPortion') : t('review.finePortion')}
            </AppText>
            <AppText
              variant="label"
              color="primary"
              accessibilityRole="button"
              style={styles.link}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  head: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  flex: { flex: 1, gap: 2 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 4 },
  details: { gap: spacing.md, paddingBottom: spacing.md, paddingRight: spacing.md },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg },
  grams: { minWidth: 64, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { paddingVertical: spacing.md },
});
