import { periodSummary, type DayTotals, type PeriodSummary } from '@plato/shared';

export type WeeklySuggestion = 'log_more' | 'protein' | 'over' | 'under' | 'consistency';

/** Picks one concrete, neutral suggestion for the next week. */
export function weeklySuggestion(s: PeriodSummary, proteinTarget: number): WeeklySuggestion {
  if (s.loggedDays < 4) return 'log_more';
  if (s.avgTargetKcal > 0 && s.avg.kcal < s.avgTargetKcal * 0.75) return 'under';
  if (s.avgTargetKcal > 0 && s.avg.kcal > s.avgTargetKcal * 1.1) return 'over';
  if (proteinTarget > 0 && s.avg.protein_g < proteinTarget * 0.8) return 'protein';
  return 'consistency';
}

export function weeklyReport(
  days: readonly DayTotals[],
  from: string,
  to: string,
  proteinTarget: number,
) {
  const summary = periodSummary(days, from, to);
  return { summary, suggestion: weeklySuggestion(summary, proteinTarget) };
}
