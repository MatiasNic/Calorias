import { MealPlanPreferencesSchema, type MealPlan, type MealPlanPreferences } from '@plato/shared';
import { useState } from 'react';
import { Share, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Banner,
  Button,
  Card,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  TextField,
} from '@/components';
import { PremiumGate } from '@/features/premium/PremiumGate';
import { useAiError } from '@/features/scan/useAiError';
import { generateMealPlan } from '@/services/ai';
import { kv } from '@/stores/kv';
import { spacing } from '@/theme';
import { formatKcal } from '@/utils/format';

const KEY = 'plato.mealPlan';
const PREFS_KEY = 'plato.mealPlanPrefs';

function loadPrefs(): MealPlanPreferences {
  try {
    return MealPlanPreferencesSchema.parse(JSON.parse(kv.get(PREFS_KEY) ?? '{}'));
  } catch {
    return MealPlanPreferencesSchema.parse({});
  }
}

export default function MealPlanScreen() {
  const { t } = useTranslation();
  const aiError = useAiError();
  const [budget, setBudget] = useState<'low' | 'mid' | 'high'>('mid');
  const [plan, setPlan] = useState<MealPlan | null>(() => {
    try {
      return JSON.parse(kv.get(KEY) ?? 'null') as MealPlan | null;
    } catch {
      return null;
    }
  });
  const [prefs, setPrefs] = useState<MealPlanPreferences>(loadPrefs);
  const [showPrefs, setShowPrefs] = useState(() => !kv.get(KEY));
  const [busy, setBusy] = useState(false);
  const update = (patch: Partial<MealPlanPreferences>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      kv.set(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await generateMealPlan(budget, 7, prefs);
      setShowPrefs(false);
      setPlan(p);
      kv.set(KEY, JSON.stringify(p));
    } catch (e) {
      setError(aiError(e));
    } finally {
      setBusy(false);
    }
  };

  const share = () => {
    if (!plan) return;
    const text = plan.shopping_list.map((i) => `• ${i.item} — ${i.quantity}`).join('\n');
    Share.share({ message: `${t('mealPlan.shoppingList')}\n${text}` }).catch(() => undefined);
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('mealPlan.title')} />
      <PremiumGate title={t('mealPlan.title')} message={t('mealPlan.empty')}>
        <AppText variant="label" color="textMuted">
          {t('mealPlan.budget')}
        </AppText>
        <SegmentedControl
          value={budget}
          onChange={setBudget}
          options={[
            { value: 'low', label: t('mealPlan.budgetLow') },
            { value: 'mid', label: t('mealPlan.budgetMid') },
            { value: 'high', label: t('mealPlan.budgetHigh') },
          ]}
        />
        {showPrefs ? (
          <Card style={styles.card}>
            <AppText variant="subheading">{t('mealPlan.prefsTitle')}</AppText>
            <AppText variant="caption" color="textMuted">
              {t('mealPlan.prefsHint')}
            </AppText>
            <TextField
              label={t('mealPlan.liked')}
              placeholder={t('mealPlan.likedPlaceholder')}
              value={prefs.liked}
              onChangeText={(liked) => update({ liked: liked.slice(0, 300) })}
              multiline
            />
            <TextField
              label={t('mealPlan.disliked')}
              placeholder={t('mealPlan.dislikedPlaceholder')}
              value={prefs.disliked}
              onChangeText={(disliked) => update({ disliked: disliked.slice(0, 300) })}
              multiline
            />
            <AppText variant="label" color="textMuted">
              {t('mealPlan.cookingTime')}
            </AppText>
            <SegmentedControl
              value={prefs.cookingTime}
              onChange={(cookingTime) => update({ cookingTime })}
              options={[
                { value: 'quick', label: t('mealPlan.cookingQuick') },
                { value: 'normal', label: t('mealPlan.cookingNormal') },
                { value: 'elaborate', label: t('mealPlan.cookingElaborate') },
              ]}
            />
            <AppText variant="label" color="textMuted">
              {t('mealPlan.mealsPerDay')}
            </AppText>
            <SegmentedControl
              value={String(prefs.mealsPerDay) as '3' | '4' | '5'}
              onChange={(v) => update({ mealsPerDay: Number(v) })}
              options={[
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
              ]}
            />
            <View style={styles.switchRow}>
              <AppText variant="label" style={styles.flex}>
                {t('mealPlan.batchCooking')}
              </AppText>
              <Switch
                accessibilityLabel={t('mealPlan.batchCooking')}
                value={prefs.batchCooking}
                onValueChange={(batchCooking) => update({ batchCooking })}
              />
            </View>
          </Card>
        ) : (
          <Button
            label={t('mealPlan.editPrefs')}
            icon="options-outline"
            variant="outline"
            size="md"
            onPress={() => setShowPrefs(true)}
          />
        )}
        <Button
          label={plan ? t('mealPlan.regenerate') : t('mealPlan.generate')}
          icon="sparkles"
          onPress={generate}
          loading={busy}
        />
        {error ? <Banner tone="danger" message={error} /> : null}
        {busy ? <Skeleton height={300} /> : null}
        {!plan && !busy ? <AppText color="textMuted">{t('mealPlan.empty')}</AppText> : null}
        {plan?.notes && !busy ? <Banner tone="info" message={plan.notes} /> : null}
        {plan && !busy ? (
          <>
            {plan.days.map((d) => (
              <Card key={d.day} style={styles.card}>
                <AppText variant="subheading">
                  {t('mealPlan.day', { n: d.day })} ·{' '}
                  {formatKcal(d.meals.reduce((s, m) => s + m.kcal, 0))} kcal
                </AppText>
                {d.meals.map((m, i) => (
                  <View key={i} style={styles.meal}>
                    <AppText variant="label" color="primary">
                      {t(`mealTypes.${m.meal_type}`)}
                    </AppText>
                    <AppText variant="bodyStrong">{m.name}</AppText>
                    <AppText variant="caption" color="textMuted">
                      {m.description} · {formatKcal(m.kcal)} kcal · P {Math.round(m.protein_g)} · C{' '}
                      {Math.round(m.carbs_g)} · G {Math.round(m.fat_g)}
                    </AppText>
                  </View>
                ))}
              </Card>
            ))}
            <Card style={styles.card}>
              <AppText variant="subheading">{t('mealPlan.shoppingList')}</AppText>
              {plan.shopping_list.map((i, idx) => (
                <AppText key={idx}>
                  • {i.item} — {i.quantity}
                </AppText>
              ))}
              <Button
                label={t('mealPlan.share')}
                icon="share-social"
                variant="outline"
                size="md"
                onPress={share}
              />
            </Card>
          </>
        ) : null}
      </PremiumGate>
      <Banner tone="info" message={t('common.disclaimer')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  meal: { gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  flex: { flex: 1 },
});
