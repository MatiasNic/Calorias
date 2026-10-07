import {
  addDays,
  adherence,
  dailyChecklist,
  suggestMealType,
  type IsoDate,
  type MealItem,
} from '@plato/shared';
import { useQuery } from '@tanstack/react-query';

import { deleteMeal, saveMeal } from '@/features/diary/hooks';
import { newId, repos } from '@/services/db/repository';
import type { SupplementIntakeRecord, SupplementRecord } from '@/services/db/types';
import { timestampFor } from '@/utils/dates';

export function useSupplements() {
  return useQuery({
    queryKey: ['db', 'supplements'],
    queryFn: async () =>
      (await repos.supplements.list()).sort(
        (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      ),
  });
}

export function useSupplement(id: string | undefined) {
  return useQuery({
    queryKey: ['db', 'supplements', 'one', id],
    queryFn: () => (id ? repos.supplements.get(id) : null),
    enabled: !!id,
  });
}

export interface ChecklistRow {
  supplement: SupplementRecord;
  slot: string;
  taken: boolean;
  intake: SupplementIntakeRecord | null;
}

/** The day's checklist (one row per scheduled dose) plus extra doses taken. */
export function useSupplementDay(date: IsoDate) {
  return useQuery({
    queryKey: ['db', 'supplement_intakes', date, 'supplements'],
    queryFn: async () => {
      const [supplements, intakes] = await Promise.all([
        repos.supplements.list(),
        repos.supplementIntakes.list({ from: date, to: date }),
      ]);
      const byId = new Map(supplements.map((s) => [s.id, s]));
      const rows: ChecklistRow[] = dailyChecklist(supplements, intakes, date).map((c) => ({
        supplement: byId.get(c.supplementId)!,
        slot: c.slot,
        taken: c.taken,
        intake:
          intakes.find((i) => i.supplement_id === c.supplementId && i.slot === c.slot) ?? null,
      }));
      const extras = intakes.filter((i) => i.slot === 'extra' && byId.has(i.supplement_id));
      return { rows, extras, supplements, byId };
    },
  });
}

/** Adherence over the last 7 and 30 days ending on `today`. */
export function useSupplementAdherence(today: IsoDate) {
  return useQuery({
    queryKey: ['db', 'supplement_intakes', 'adherence', today, 'supplements'],
    queryFn: async () => {
      const [supplements, intakes] = await Promise.all([
        repos.supplements.list(),
        repos.supplementIntakes.list({ from: addDays(today, -29), to: today }),
      ]);
      return {
        week: adherence(supplements, intakes, addDays(today, -6), today),
        month: adherence(supplements, intakes, addDays(today, -29), today),
      };
    },
  });
}

export type SupplementInput = Omit<SupplementRecord, 'id'> & { id?: string };

export function saveSupplement(input: SupplementInput) {
  return repos.supplements.upsert({ ...input, id: input.id ?? newId() });
}

/** Deletes a supplement and its intake history (diary meals already logged stay). */
export async function deleteSupplement(id: string) {
  const intakes = (await repos.supplementIntakes.list()).filter((i) => i.supplement_id === id);
  for (const i of intakes) await repos.supplementIntakes.remove(i.id);
  await repos.supplements.remove(id);
}

const slotTime = (slot: string) => {
  const [h, m] = slot.split(':').map(Number);
  return Number.isFinite(h) ? { h: h!, m: m ?? 0 } : undefined;
};

/** Diary item for one dose of a supplement that has nutrition (whey, collagen…). */
export function supplementMealItem(s: SupplementRecord, doseLabel: string): MealItem | null {
  if (!s.nutrition || !s.count_in_macros) return null;
  return {
    display_name: s.name,
    food_id: null,
    food_source: 'custom',
    // One dose is stored as a 100 g "portion" so the per100g math stays exact.
    grams: 100,
    serving_unit: doseLabel,
    serving_qty: 1,
    per100g: s.nutrition,
    nutrients: s.nutrition,
    user_edited: false,
  };
}

/** Marks a dose as taken: records the intake, lowers the stock and logs macros when needed. */
export async function takeDose(
  s: SupplementRecord,
  date: IsoDate,
  slot: string,
  doseLabel: string,
): Promise<SupplementIntakeRecord> {
  const time = slotTime(slot);
  const item = supplementMealItem(s, doseLabel);
  let mealId: string | null = null;
  if (item) {
    const meal = await saveMeal({
      date,
      eatenAt: timestampFor(date, time),
      mealType: suggestMealType(time?.h ?? new Date().getHours()),
      source: 'manual',
      items: [item],
    });
    mealId = meal.id;
  }
  if (s.stock != null) {
    await repos.supplements.upsert({ ...s, stock: Math.max(0, s.stock - 1) });
  }
  return repos.supplementIntakes.upsert({
    id: newId(),
    supplement_id: s.id,
    taken_at: timestampFor(date, time),
    local_date: date,
    slot,
    dose_amount: s.dose_amount,
    meal_id: mealId,
  });
}

/** Undoes a dose: restores the stock and removes the diary meal it created. */
export async function undoDose(intake: SupplementIntakeRecord) {
  const s = await repos.supplements.get(intake.supplement_id);
  if (s && s.stock != null) await repos.supplements.upsert({ ...s, stock: s.stock + 1 });
  if (intake.meal_id) await deleteMeal(intake.meal_id).catch(() => undefined);
  await repos.supplementIntakes.remove(intake.id);
}
