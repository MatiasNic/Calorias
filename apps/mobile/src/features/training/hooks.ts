import { addDays, personalRecords, trainingStats, type IsoDate } from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { newId, repos } from '@/services/db/repository';
import type { WorkoutRecord } from '@/services/db/types';

export function useWorkoutsForDate(date: IsoDate) {
  return useQuery({
    queryKey: ['db', 'workouts', date],
    queryFn: () => repos.workouts.list({ from: date, to: date }),
  });
}

/** Workouts between two dates (inclusive), newest first. */
export function useWorkouts(from?: IsoDate, to?: IsoDate) {
  return useQuery({
    queryKey: ['db', 'workouts', 'range', from, to],
    queryFn: async () =>
      (await repos.workouts.list({ from, to })).sort((a, b) =>
        b.started_at.localeCompare(a.started_at),
      ),
  });
}

export function useWorkout(id: string | undefined) {
  return useQuery({
    queryKey: ['db', 'workouts', 'one', id],
    queryFn: () => (id ? repos.workouts.get(id) : null),
    enabled: !!id,
  });
}

/** Stats for the 7 days ending on `today`, plus all-time personal records. */
export function useTrainingOverview(today: IsoDate) {
  return useQuery({
    queryKey: ['db', 'workouts', 'overview', today],
    queryFn: async () => {
      const all = await repos.workouts.list();
      const weekFrom = addDays(today, -6);
      const week = all.filter((w) => w.local_date >= weekFrom && w.local_date <= today);
      return {
        week: trainingStats(week),
        total: trainingStats(all),
        records: personalRecords(all),
      };
    },
  });
}

export type WorkoutInput = Omit<WorkoutRecord, 'id'> & { id?: string };

export function saveWorkout(input: WorkoutInput) {
  return repos.workouts.upsert({ ...input, id: input.id ?? newId() });
}

export const deleteWorkout = (id: string) => repos.workouts.remove(id);

/** Last time an exercise was done (to prefill sets). */
export async function lastSetsFor(key: string) {
  const all = await repos.workouts.list();
  for (const w of all.sort((a, b) => b.started_at.localeCompare(a.started_at))) {
    const ex = w.exercises.find((e) => e.key === key);
    if (ex?.sets.length) return ex.sets;
  }
  return null;
}
