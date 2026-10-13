import { confidenceLevel, PORTION_SIZES, type MealItem } from '@bocado/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, Icon, IconButton, SegmentedControl } from '@/components';
import { PortionEditor } from '@/features/foods/PortionEditor';
import { getRegionalFood } from '@/features/foods/search';
import { fontFamily, radii, spacing, useTheme } from '@/theme';
import { formatKcal } from '@/utils/format';
import { applyCookingMethod, cookingChoicesFor, isCookable } from './cooking';
import { useDraftStore } from './draftStore';

/** Grams step: 10 % of the base portion, rounded to 5 g. */
const stepFor = (base: number) => Math.max(5, Math.round((base * 0.1) / 5) * 5);

/**
 * One food of a meal being reviewed: a single line (name, portion, kcal) that opens into the
 * size (chica / mediana / grande), grams, cooking method and "Cambiar alimento".
 * Removing stays one tap away.
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
  const step = stepFor(base);
  const servings =
    item.food_source === 'regional' && item.food_id
      ? (getRegionalFood(item.food_id)?.servings ?? [])
      : [];
  const unsure = showConfidence && confidenceLevel(item.ai_confidence) === 'low';
  // The cooking method is part of the line when it matters for the calories (or was changed).
  const cooked =
    !!item.cooking_method &&
    (['fried', 'deep_fried', 'grilled', 'boiled'].includes(item.cooking_method) ||
      (item.user_edited && isCookable(item) && item.cooking_method !== 'unknown'));
  const meta = [
    item.serving_unit,
    `${Math.round(item.grams)} g`,
    cooked ? t(`cooking.${item.cooking_method!}`).toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const size =
    PORTION_SIZES.find((s) => Math.round(base * s.factor) === Math.round(item.grams))?.key ?? null;

  return (
    <Animated.View
      layout={LinearTransition}
      entering={FadeIn}
      style={[
        styles.wrap,
        { backgroundColor: colors.surface, borderColor: open ? colors.text : colors.border },
      ]}
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
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {unsure ? `${meta} · ${t('review.checkPortion')}` : meta}
              </AppText>
            </View>
          </View>
          <AppText style={styles.kcal} tabular>
            {formatKcal(item.nutrients.kcal)}
            <AppText variant="caption" color="textSubtle">
              {' '}
              kcal
            </AppText>
          </AppText>
          <Icon name={open ? 'expand_less' : 'expand_more'} color="textSubtle" size={20} />
        </Pressable>
        <IconButton
          icon="delete"
          size={22}
          accessibilityLabel={t('review.removeNamed', { name: item.display_name })}
          color="textSubtle"
          onPress={() => removeItem(index)}
          testID={`draft-remove-${index}`}
        />
      </View>
      {open ? (
        <View style={[styles.details, { borderTopColor: colors.border }]}>
          <SegmentedControl
            tone="strong"
            accessibilityLabel={t('review.sizeLabel')}
            options={PORTION_SIZES.map((s) => ({ value: s.key, label: t(`review.size.${s.key}`) }))}
            value={size ?? ('' as never)}
            onChange={(k) => {
              const f = PORTION_SIZES.find((s) => s.key === k)!.factor;
              setGrams(index, Math.round(base * f));
            }}
          />
          <View style={styles.quick}>
            <View style={[styles.stepper, { backgroundColor: colors.surfaceAlt }]}>
              <IconButton
                icon="remove"
                size={20}
                accessibilityLabel={t('review.less', { name: item.display_name })}
                onPress={() => setGrams(index, Math.max(1, Math.round(item.grams) - step))}
              />
              <AppText style={styles.grams} tabular>
                {Math.round(item.grams)} g
              </AppText>
              <IconButton
                icon="add"
                size={20}
                accessibilityLabel={t('review.more', { name: item.display_name })}
                onPress={() => setGrams(index, Math.round(item.grams) + step)}
              />
            </View>
            <AppText variant="caption" color="textMuted" tabular>
              P {Math.round(item.nutrients.protein_g)} · C {Math.round(item.nutrients.carbs_g)} · G{' '}
              {Math.round(item.nutrients.fat_g)}
            </AppText>
          </View>
          {isCookable(item) ? (
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
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/food-search',
                  params: { target: 'draft', replace: String(index) },
                })
              }
              style={styles.link}
            >
              <Icon name="swap_horiz" size={20} color="textMuted" />
              <AppText variant="label" color="textMuted">
                {t('review.changeFood')}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFine(!fine)}
              style={styles.link}
            >
              <AppText variant="label" color="textMuted">
                {fine ? t('review.lessPortion') : t('review.finePortion')}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1.5, borderRadius: radii.xl, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg },
  head: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64 },
  flex: { flex: 1, gap: 2 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 4 },
  kcal: { fontFamily: fontFamily.extrabold, fontSize: 16 },
  details: {
    gap: 14,
    paddingTop: 14,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.pill, height: 44 },
  grams: { minWidth: 64, textAlign: 'center', fontFamily: fontFamily.extrabold, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
});
