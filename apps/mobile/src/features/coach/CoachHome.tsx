import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, DictateButton, Icon, type SymbolName } from '@/components';
import { useDaySummary } from '@/features/diary/useDaySummary';
import { usePlan } from '@/services/purchases';
import { fontFamily, radii, spacing, useTheme, type ThemeColors } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';
import { loadPantry, savePantry } from './conversation';

const TOOLS: {
  key: 'mealPlan' | 'adaptive' | 'micros';
  icon: SymbolName;
  href: Href;
  tint: keyof ThemeColors;
}[] = [
  { key: 'mealPlan', icon: 'calendar_month', href: '/meal-plan', tint: 'mealLunch' },
  { key: 'adaptive', icon: 'trending_up', href: '/adaptive', tint: 'mealDinner' },
  { key: 'micros', icon: 'nutrition', href: '/micros', tint: 'mealSnack' },
];

/** What's left today, at a glance (the coach sees the same numbers). */
function TodayLeft() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { summary } = useDaySummary(todayLocal());
  const left = (target: number, consumed: number) => Math.max(0, Math.round(target - consumed));
  const macros = [
    {
      key: 'protein',
      label: t('macros.protein'),
      v: left(summary.target.protein_g, summary.consumed.protein_g),
    },
    {
      key: 'carbs',
      label: t('macros.carbs'),
      v: left(summary.target.carbs_g, summary.consumed.carbs_g),
    },
    { key: 'fat', label: t('macros.fat'), v: left(summary.target.fat_g, summary.consumed.fat_g) },
  ] as const;
  return (
    <View style={[styles.today, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.flex}>
        <AppText variant="caption" color="textMuted">
          {t('coach.leftTodayTitle')}
        </AppText>
        <AppText variant="heading" tabular>
          {formatKcal(Math.max(0, summary.remainingKcal))}{' '}
          <AppText variant="body" color="textMuted">
            kcal
          </AppText>
        </AppText>
      </View>
      <View style={styles.todayMacros}>
        {macros.map((m) => (
          <View key={m.key} style={styles.todayMacro}>
            <View style={[styles.dot, { backgroundColor: colors[m.key] }]} />
            <AppText variant="caption" color="textMuted" tabular>
              {m.label} {m.v} g
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Empty-chat start: today's numbers, the premium tools one tap away, and the most common ask
 * ("¿qué cocino con lo que tengo?") as a first-class action.
 */
export function CoachHome({
  onAsk,
  onPhoto,
  busy,
}: {
  onAsk: (text: string) => void;
  onPhoto: (kind: 'fridge' | 'menu') => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const plan = usePlan();
  const [pantry, setPantry] = useState(loadPantry);

  const askPantry = () => {
    const items = pantry.trim();
    if (!items) return;
    savePantry(items);
    onAsk(t('coach.pantryAsk', { items }));
  };

  return (
    <View style={styles.wrap}>
      <TodayLeft />

      <View
        style={[styles.pantry, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.pantryHead}>
          <View style={[styles.tile, { backgroundColor: `${colors.mealBreakfast}22` }]}>
            <Icon name="soup_kitchen" size={22} rawColor={colors.mealBreakfast} />
          </View>
          <View style={styles.flex}>
            <AppText variant="subheading">{t('coach.pantryTitle')}</AppText>
            <AppText variant="caption" color="textMuted">
              {t('coach.pantryHint')}
            </AppText>
          </View>
        </View>
        <TextInput
          value={pantry}
          onChangeText={setPantry}
          placeholder={t('coach.pantryPlaceholder')}
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={300}
          accessibilityLabel={t('coach.pantryTitle')}
          testID="coach-pantry-input"
          style={[styles.pantryInput, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
        />
        <View style={styles.pantryActions}>
          <DictateButton
            value={pantry}
            onChangeText={setPantry}
            size={48}
            testID="coach-pantry-mic"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('coach.fridgePhoto')}
            onPress={() => onPhoto('fridge')}
            hitSlop={6}
            style={[styles.photoBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Icon name="photo_camera" size={20} />
            <AppText variant="label">{t('coach.fridgeShort')}</AppText>
          </Pressable>
          <View style={styles.flex} />
          <Button
            label={t('coach.pantryGo')}
            icon="auto_awesome"
            size="md"
            fullWidth={false}
            disabled={!pantry.trim() || busy}
            onPress={askPantry}
            testID="coach-pantry-go"
          />
        </View>
      </View>

      <View style={styles.starters}>
        {(
          [
            ['dinner', 'dinner_dining'],
            ['snack', 'bolt'],
            ['menu', 'restaurant'],
          ] as const
        ).map(([k, icon]) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            onPress={() => (k === 'menu' ? onPhoto('menu') : onAsk(t(`coach.starters.${k}`)))}
            style={[
              styles.starter,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Icon name={icon} size={20} color="textMuted" />
            <AppText variant="label" style={styles.flex}>
              {t(`coach.startersShort.${k}`)}
            </AppText>
            <Icon name="chevron-forward" size={18} color="textSubtle" />
          </Pressable>
        ))}
      </View>

      <AppText variant="caption" color="textMuted" style={styles.section}>
        {t('coach.toolsTitle')}
      </AppText>
      <View style={styles.tools}>
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.key}
            accessibilityRole="button"
            onPress={() => router.push(tool.href)}
            style={[styles.tool, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={[styles.tile, { backgroundColor: `${colors[tool.tint]}22` }]}>
              <Icon name={tool.icon} size={20} rawColor={colors[tool.tint]} />
            </View>
            <AppText variant="label" numberOfLines={2} style={styles.toolText}>
              {t(`coach.tools.${tool.key}`)}
            </AppText>
            {plan !== 'premium' ? (
              <View style={styles.lock}>
                <Icon name="lock-closed" size={12} color="textSubtle" />
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  flex: { flex: 1 },
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  todayMacros: { gap: 2 },
  todayMacro: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pantry: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  pantryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pantryInput: {
    minHeight: 64,
    maxHeight: 120,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  pantryActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radii.md,
  },
  starters: { gap: spacing.sm },
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  section: { marginTop: spacing.xs },
  tools: { flexDirection: 'row', gap: spacing.sm },
  tool: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
    minHeight: 96,
  },
  toolText: { minHeight: 32 },
  lock: { position: 'absolute', top: spacing.sm, right: spacing.sm },
});
