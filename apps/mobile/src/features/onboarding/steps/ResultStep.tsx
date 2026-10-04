import { kgToLb } from '@plato/shared';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card, MacroBar, ProgressRing } from '@/components';
import { LineChart } from '@/components/charts';
import { GoalWarnings } from '@/features/goals/GoalWarnings';
import { usePrefsStore } from '@/stores/prefs';
import { spacing, useTheme } from '@/theme';
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

  return (
    <StepScaffold title={t('onboarding.result.title')} subtitle={t('onboarding.result.subtitle')}>
      <Animated.View entering={FadeInUp.duration(500)}>
        <Card style={styles.center}>
          <ProgressRing
            progress={1}
            size={190}
            accessibilityLabel={t('onboarding.result.kcalA11y', { kcal: plan.kcal })}
          >
            <AppText variant="display" tabular testID="result-kcal">
              {formatKcal(plan.kcal)}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {t('onboarding.result.kcalPerDay')}
            </AppText>
          </ProgressRing>
          <View style={styles.stats}>
            <Stat label={t('onboarding.result.bmr')} value={`${formatKcal(plan.bmr)} kcal`} />
            <Stat label={t('onboarding.result.tdee')} value={`${formatKcal(plan.tdee)} kcal`} />
            <Stat label={t('onboarding.result.water')} value={`${water.value} ${water.unit}`} />
          </View>
        </Card>
      </Animated.View>
      <Card style={styles.macros}>
        <AppText variant="subheading">{t('onboarding.result.macrosTitle')}</AppText>
        <MacroBar
          label={t('macros.protein')}
          value={plan.macros.protein_g}
          target={plan.macros.protein_g}
          color={colors.protein}
        />
        <MacroBar
          label={t('macros.carbs')}
          value={plan.macros.carbs_g}
          target={plan.macros.carbs_g}
          color={colors.carbs}
        />
        <MacroBar
          label={t('macros.fat')}
          value={plan.macros.fat_g}
          target={plan.macros.fat_g}
          color={colors.fat}
        />
        <AppText variant="caption" color="textMuted">
          {t('onboarding.result.macrosExplain')}
        </AppText>
      </Card>
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
                color: colors.primary,
                fill: true,
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color="textMuted" align="center">
        {label}
      </AppText>
      <AppText variant="bodyStrong" align="center" tabular>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  stat: { flex: 1, gap: 2 },
  macros: { gap: spacing.md },
});
