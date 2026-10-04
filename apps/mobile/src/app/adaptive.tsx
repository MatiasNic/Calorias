import { addDays, ADAPTIVE, computeAdaptiveTarget, splitMacros } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, Card, Screen, ScreenHeader, Skeleton, toast } from '@/components';
import { goalForDate, saveCustomGoal } from '@/features/goals/hooks';
import { PremiumGate } from '@/features/premium/PremiumGate';
import { planFromProfile, useProfile } from '@/features/profile/hooks';
import { toEntries } from '@/features/progress/hooks';
import { repos } from '@/services/db/repository';
import { spacing } from '@/theme';
import { todayLocal } from '@/utils/dates';
import { formatKcal } from '@/utils/format';

export default function Adaptive() {
  const { t } = useTranslation();
  const profile = useProfile();
  const [applied, setApplied] = useState(false);
  const q = useQuery({
    queryKey: ['db', 'meals', 'adaptive'],
    enabled: !!profile.data,
    queryFn: async () => {
      const today = todayLocal();
      const from = addDays(today, -21);
      const [meals, weights, goals] = await Promise.all([
        repos.meals.list({ from, to: addDays(today, -1) }),
        repos.weight.list({ from, to: today }),
        repos.goals.list(),
      ]);
      const byDate = new Map<string, { kcal: number; mealCount: number }>();
      for (const m of meals) {
        const d = byDate.get(m.local_date) ?? { kcal: 0, mealCount: 0 };
        d.kcal += m.totals.kcal;
        d.mealCount += 1;
        byDate.set(m.local_date, d);
      }
      const goal = goalForDate(goals, today);
      const latest = weights[weights.length - 1]?.weight_kg ?? null;
      const plan = profile.data ? planFromProfile(profile.data, latest) : null;
      if (!plan?.ok || !profile.data?.sex) return { goal, result: null, plan: null };
      const result = computeAdaptiveTarget({
        intakes: [...byDate.entries()].map(([date, v]) => ({ date, ...v })),
        weights: toEntries(weights),
        plannedWeeklyChangeKg: plan.plan.weeklyChangeKg,
        currentTargetKcal: goal.kcal,
        previousTdeeEstimate: goal.mode === 'adaptive' ? goal.tdee_estimate : null,
        sex: profile.data.sex,
        bmr: plan.plan.bmr,
      });
      return { goal, result, plan: plan.plan };
    },
  });

  const apply = async () => {
    const r = q.data?.result;
    if (!r || r.status !== 'ok' || !profile.data?.height_cm || !q.data?.plan) return;
    const latest = (await repos.weight.list()).at(-1)?.weight_kg ?? 70;
    const macros = splitMacros({
      kcal: r.newTargetKcal,
      goal: q.data.plan.effectiveGoal,
      weightKg: latest,
      heightCm: profile.data.height_cm,
      dietaryPreferences: profile.data.dietary_preferences,
    });
    await saveCustomGoal({
      kcal: r.newTargetKcal,
      ...macros,
      water_ml: q.data.goal.water_ml,
      mode: 'adaptive',
      tdee_estimate: r.estimatedTdee,
    });
    setApplied(true);
    toast.success(t('adaptive.applied'));
  };

  const r = q.data?.result;
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title={t('adaptive.title')} />
      <AppText color="textMuted">{t('adaptive.description')}</AppText>
      <PremiumGate title={t('adaptive.title')}>
        {q.isLoading ? (
          <Skeleton height={160} />
        ) : !r ? (
          <Banner tone="info" message={t('onboarding.result.incomplete')} />
        ) : r.status === 'insufficient_data' ? (
          <Banner
            tone="info"
            message={t('adaptive.insufficient', {
              days: ADAPTIVE.minLoggedDays,
              weighIns: ADAPTIVE.minWeighIns,
              logged: r.loggedDays,
              weights: r.weighIns,
            })}
          />
        ) : (
          <Card style={styles.card}>
            <AppText>
              {t('adaptive.result', {
                tdee: formatKcal(r.estimatedTdee),
                intake: formatKcal(r.avgIntakeKcal),
                change: r.trendChangeKg,
              })}
            </AppText>
            <AppText variant="title" tabular>
              {t('adaptive.newTarget', {
                kcal: formatKcal(r.newTargetKcal),
                delta: `${r.deltaKcal >= 0 ? '+' : '−'}${Math.abs(r.deltaKcal)}`,
              })}
            </AppText>
            {r.clamped ? <Banner tone="info" message={t('adaptive.clamped')} /> : null}
            {r.floorApplied ? <Banner tone="warning" message={t('adaptive.floor')} /> : null}
            <Button
              label={t('adaptive.apply')}
              onPress={apply}
              disabled={applied || r.deltaKcal === 0}
            />
          </Card>
        )}
      </PremiumGate>
      <Banner tone="info" message={t('common.disclaimer')} />
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.md } });
