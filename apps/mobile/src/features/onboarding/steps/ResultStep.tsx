import { kgToLb } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card } from '@/components';
import { LineChart } from '@/components/charts';
import { GoalWarnings } from '@/features/goals/GoalWarnings';
import { usePrefsStore } from '@/stores/prefs';
import { radii, spacing, useTheme } from '@/theme';
import { formatDay } from '@/utils/dates';
import { formatKcal, formatNumber, formatVolume } from '@/utils/format';
import { planFromAnswers } from '../plan';
import { useOnboardingStore } from '../store';
import { StepScaffold } from './StepScaffold';

export function ResultStep() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const answers = useOnboardingStore((s) => s.answers);
  const units = usePrefsStore((s) => s.units);
  const result = planFromAnswers(answers);

  if (!result) return <Banner tone="danger" message={t('onboarding.result.incomplete')} />;
  if (!result.ok) {
    return (
      <StepScaffold title={t('onboarding.result.blockedTitle')}>
        <Banner tone="danger" message={t(`onboarding.result.blocked.${result.reason}`)} />
        <Banner tone="info" message={t('common.disclaimer')} />
      </StepScaffold>
    );
  }
  const { plan } = result;
  const w = (kg: number) => (units === 'imperial' ? kgToLb(kg) : kg);
  const water = formatVolume(plan.waterMl, units);
  const macros = [
    {
      key: 'p',
      label: t('macros.protein'),
      grams: plan.macros.protein_g,
      kcal: plan.macros.protein_g * 4,
      color: colors.protein,
    },
    {
      key: 'c',
      label: t('macros.carbs'),
      grams: plan.macros.carbs_g,
      kcal: plan.macros.carbs_g * 4,
      color: colors.carbs,
    },
    {
      key: 'f',
      label: t('macros.fat'),
      grams: plan.macros.fat_g,
      kcal: plan.macros.fat_g * 9,
      color: colors.fat,
    },
  ];

  return (
    <StepScaffold title={t('onboarding.result.title')} subtitle={t('onboarding.result.subtitle')}>
      <Animated.View entering={FadeInUp.duration(500)}>
        <Card
          style={styles.main}
          accessibilityLabel={t('onboarding.result.kcalA11y', { kcal: plan.kcal })}
        >
          <View style={styles.hero}>
            <AppText variant="numberHero" testID="result-kcal">
              {formatKcal(plan.kcal)}
            </AppText>
            <AppText variant="bodyStrong" color="textMuted" style={styles.unit}>
              {t('onboarding.result.kcalPerDay')}
            </AppText>
          </View>
          <View style={styles.split}>
            {macros.map((m) => (
              <View
                key={m.key}
                style={[styles.segment, { flex: m.kcal, backgroundColor: m.color }]}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {macros.map((m) => (
              <View key={m.key} style={styles.legendItem}>
                <View style={styles.legendLabel}>
                  <View style={[styles.dot, { backgroundColor: m.color }]} />
                  <AppText variant="caption" color="textMuted">
                    {m.label}
                  </AppText>
                </View>
                <AppText variant="number" tabular>
                  {m.grams} g
                </AppText>
              </View>
            ))}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <AppText variant="caption" color="textMuted">
            {t('onboarding.result.summaryLine', {
              bmr: formatKcal(plan.bmr),
              tdee: formatKcal(plan.tdee),
              water: `${water.value} ${water.unit}`,
            })}
          </AppText>
        </Card>
      </Animated.View>
      {plan.estimatedDate ? (
        <Card style={styles.macros}>
          <AppText variant="subheading">{t('onboarding.result.projectionTitle')}</AppText>
          <AppText color="textMuted">
            {t('onboarding.result.projection', {
              date: formatDay(plan.estimatedDate, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
              weeks: plan.estimatedWeeks,
            })}
          </AppText>
          <LineChart
            accessibilityLabel={t('onboarding.result.projectionA11y')}
            series={[
              {
                points: plan.projection.map((p) => ({ x: p.week, y: w(p.weightKg) })),
                color: colors.kcal,
                fill: false,
                showDots: true,
              },
            ]}
            yFormat={(v) => formatNumber(v, 0)}
            xLabels={plan.projection
              .filter((_, i, a) => i === 0 || i === a.length - 1)
              .map((p) => ({ x: p.week, label: t('onboarding.result.weekShort', { n: p.week }) }))}
          />
        </Card>
      ) : null}
      <GoalWarnings warnings={plan.warnings} />
      <Banner tone="info" message={t('common.disclaimer')} />
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  main: { gap: spacing.md },
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  unit: { marginBottom: spacing.sm },
  split: { flexDirection: 'row', gap: 3, height: 8 },
  segment: { borderRadius: radii.pill },
  legend: { flexDirection: 'row' },
  legendItem: { flex: 1, gap: 2 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  macros: { gap: spacing.md },
});
