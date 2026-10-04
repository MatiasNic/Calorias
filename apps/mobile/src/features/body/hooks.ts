import { WATER_QUICK_ADD_ML, type IsoDate } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { newId, repos } from '@/services/db/repository';
import { timestampFor } from '@/utils/dates';

export function useWaterForDate(date: IsoDate) {
  return useQuery({
    queryKey: ['db', 'water', date],
    queryFn: async () => {
      const logs = await repos.water.list({ from: date, to: date });
      return { logs, totalMl: logs.reduce((s, l) => s + l.ml, 0) };
    },
  });
}

export async function addWater(date: IsoDate, ml: number = WATER_QUICK_ADD_ML) {
  return repos.water.upsert({ id: newId(), logged_at: timestampFor(date), local_date: date, ml });
}

/** Removes the most recent water entry of the day (undo). */
export async function undoLastWater(date: IsoDate) {
  const logs = await repos.water.list({ from: date, to: date });
  const last = logs.sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1))[0];
  if (last) await repos.water.remove(last.id);
}

export function useWeights(from?: IsoDate, to?: IsoDate) {
  return useQuery({
    queryKey: ['db', 'weight', from, to],
    queryFn: () => repos.weight.list({ from, to }),
  });
}

export async function latestWeightKg(): Promise<number | null> {
  const all = await repos.weight.list();
  return all.length ? all[all.length - 1]!.weight_kg : null;
}

export function useLatestWeight() {
  return useQuery({ queryKey: ['db', 'weight', 'latest'], queryFn: latestWeightKg });
}

/** One weigh-in per day: re-logging the same day replaces it. */
export async function logWeight(
  date: IsoDate,
  weightKg: number,
  source: 'manual' | 'health' = 'manual',
) {
  const sameDay = await repos.weight.list({ from: date, to: date });
  return repos.weight.upsert({
    id: sameDay[0]?.id ?? newId(),
    logged_at: timestampFor(date),
    local_date: date,
    weight_kg: Math.round(weightKg * 100) / 100,
    source,
  });
}

export const deleteWeight = (id: string) => repos.weight.remove(id);

export function useMeasurements() {
  return useQuery({ queryKey: ['db', 'measurements'], queryFn: () => repos.measurements.list() });
}
