import type { MealPlan } from '@plato/shared';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
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
} from '@/components';
import { PremiumGate } from '@/features/premium/PremiumGate';
import { useAiError } from '@/features/scan/useAiError';
import { generateMealPlan } from '@/services/ai';
import { kv } from '@/stores/kv';
import { spacing } from '@/theme';
import { formatKcal } from '@/utils/format';

const KEY = 'plato.mealPlan';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await generateMealPlan(budget);
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
        <Button
          label={plan ? t('mealPlan.regenerate') : t('mealPlan.generate')}
          icon="sparkles"
          onPress={generate}
          loading={busy}
        />
        {error ? <Banner tone="danger" message={error} /> : null}
        {busy ? <Skeleton height={300} /> : null}
        {!plan && !busy ? <AppText color="textMuted">{t('mealPlan.empty')}</AppText> : null}
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
});
