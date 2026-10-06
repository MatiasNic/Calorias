import { ACHIEVEMENTS, type Achievement } from '@plato/shared';

import { i18next } from '@/i18n';

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function findAchievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

export function achievementTitle(id: string): string {
  const a = BY_ID.get(id);
  return a ? i18next.t(`achievements.metrics.${a.metric}.title`, { count: a.threshold }) : id;
}

export function achievementDescription(id: string): string {
  const a = BY_ID.get(id);
  return a ? i18next.t(`achievements.metrics.${a.metric}.description`, { count: a.threshold }) : '';
}
