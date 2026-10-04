import type { GoalWarning } from '@plato/shared';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components';
import { spacing } from '@/theme';

const TONE: Record<GoalWarning, 'warning' | 'info'> = {
  rate_capped: 'warning',
  aggressive_rate: 'warning',
  calorie_floor_applied: 'info',
  below_bmr: 'warning',
  minor_no_deficit: 'info',
  target_inconsistent: 'info',
  gain_rate_capped: 'info',
};

export function GoalWarnings({ warnings }: { warnings: readonly GoalWarning[] }) {
  const { t } = useTranslation();
  if (!warnings.length) return null;
  return (
    <View style={{ gap: spacing.sm }}>
      {warnings.map((w) => (
        <Banner key={w} tone={TONE[w]} message={t(`goals.warnings.${w}`)} />
      ))}
    </View>
  );
}
