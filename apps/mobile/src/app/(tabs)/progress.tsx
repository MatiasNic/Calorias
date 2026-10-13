import { useTranslation } from 'react-i18next';

import { AppText, Screen, SegmentedControl, Skeleton } from '@/components';
import { useProfile } from '@/features/profile/hooks';
import { CaloriesSummaryCard } from '@/features/progress/components/CaloriesSummaryCard';
import { MacrosSummaryCard } from '@/features/progress/components/MacrosSummaryCard';
import { ProgressLinks } from '@/features/progress/components/ProgressLinks';
import { WeightTrendCard } from '@/features/progress/components/WeightTrendCard';
import { useProgress } from '@/features/progress/hooks';
import { type ProgressRange, useProgressRange } from '@/features/progress/useProgressRange';

export default function Progress() {
  const { t } = useTranslation();
  const { plan, maxDays, effective, changeRange } = useProgressRange();
  const q = useProgress(effective);
  const profile = useProfile();
  const data = q.data;

  return (
    <Screen>
      <AppText variant="title" accessibilityRole="header">
        {t('progress.title')}
      </AppText>
      <SegmentedControl<string>
        value={String(effective)}
        onChange={(v) => changeRange(Number(v) as ProgressRange)}
        options={[
          { value: '7', label: t('progress.range.week') },
          {
            value: '30',
            label: `${t('progress.range.month')}${maxDays && maxDays < 30 ? ' 🔒' : ''}`,
          },
          {
            value: '90',
            label: `${t('progress.range.quarter')}${maxDays && maxDays < 90 ? ' 🔒' : ''}`,
          },
        ]}
      />
      {q.isLoading || !data ? (
        <Skeleton height={240} radius={20} />
      ) : (
        <>
          <WeightTrendCard data={data} target={profile.data?.target_weight_kg ?? null} />
          <CaloriesSummaryCard data={data} days={effective} />
          {data.summary.loggedDays ? <MacrosSummaryCard data={data} /> : null}
          <ProgressLinks plan={plan} />
        </>
      )}
    </Screen>
  );
}
