import { normalizeText, type CookingMethod, type MealItem } from '@bocado/shared';

/** One line of "Entendí: …": what a spoken correction changed, with its calorie delta. */
export interface CorrectionChange {
  name: string;
  kind: 'removed' | 'added' | 'cooking' | 'grams';
  method?: CookingMethod | null;
  grams?: number;
  deltaKcal: number;
}

const key = (i: MealItem) => normalizeText(i.display_name).split(' ')[0] ?? '';

/** Compares the list before and after a correction (items are matched by id, then by name). */
export function diffItems(
  before: readonly MealItem[],
  after: readonly MealItem[],
): CorrectionChange[] {
  const left = [...after];
  const changes: CorrectionChange[] = [];
  for (const b of before) {
    const idx = left.findIndex((a) => (a.id && a.id === b.id) || key(a) === key(b));
    if (idx < 0) {
      changes.push({ name: b.display_name, kind: 'removed', deltaKcal: -b.nutrients.kcal });
      continue;
    }
    const a = left.splice(idx, 1)[0]!;
    const delta = a.nutrients.kcal - b.nutrients.kcal;
    if (Math.abs(delta) < 1) continue;
    if ((a.cooking_method ?? null) !== (b.cooking_method ?? null))
      changes.push({
        name: b.display_name,
        kind: 'cooking',
        method: a.cooking_method,
        deltaKcal: delta,
      });
    else changes.push({ name: b.display_name, kind: 'grams', grams: a.grams, deltaKcal: delta });
  }
  for (const a of left)
    changes.push({ name: a.display_name, kind: 'added', deltaKcal: a.nutrients.kcal });
  return changes;
}
