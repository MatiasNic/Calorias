import type { WidgetAction, WidgetSnapshot } from './snapshot';

/** Click actions a widget can send (they run in the background, the app stays closed). */
export const ACTIONS = {
  water: 'ADD_WATER',
  undoWater: 'UNDO_WATER',
  usual: 'LOG_USUAL',
} as const;

const DEFAULT_WATER_ML = 250;
let seq = 0;
const newActionId = (now: Date) => `${now.getTime().toString(36)}-${(seq++).toString(36)}`;

/**
 * Applies a widget tap to the numbers the widgets show and records it for the app.
 * Pure: returns the new snapshot and queue (the caller saves them).
 */
export function applyWidgetClick(
  snapshot: WidgetSnapshot,
  queue: readonly WidgetAction[],
  clickAction: string | undefined,
  data: Record<string, unknown> | undefined,
  now: Date,
): { snapshot: WidgetSnapshot; queue: WidgetAction[] } {
  const base = { id: newActionId(now), date: snapshot.date, at: now.toISOString() };
  const q = [...queue];

  if (clickAction === ACTIONS.water) {
    const ml = typeof data?.ml === 'number' && data.ml > 0 ? data.ml : DEFAULT_WATER_ML;
    q.push({ ...base, type: 'water', ml });
    return { snapshot: { ...snapshot, waterMl: snapshot.waterMl + ml }, queue: q };
  }

  if (clickAction === ACTIONS.undoWater) {
    if (snapshot.waterMl <= 0) return { snapshot, queue: q };
    // Undo a glass added from the widget that the app hasn't saved yet, or the app's last one.
    const last = q
      .map((a, i) => ({ a, i }))
      .reverse()
      .find(({ a }) => a.type === 'water' && a.date === snapshot.date);
    const ml = last && last.a.type === 'water' ? last.a.ml : DEFAULT_WATER_ML;
    if (last) q.splice(last.i, 1);
    else q.push({ ...base, type: 'undoWater' });
    return { snapshot: { ...snapshot, waterMl: Math.max(0, snapshot.waterMl - ml) }, queue: q };
  }

  if (clickAction === ACTIONS.usual) {
    const meal = snapshot.usual.find((u) => u.recordId === data?.recordId);
    if (!meal) return { snapshot, queue: q };
    const pending = q.findIndex(
      (a) => a.type === 'usual' && a.recordId === meal.recordId && a.date === snapshot.date,
    );
    const sign = pending >= 0 ? -1 : 1;
    // A second tap on a meal logged from the widget (not yet saved by the app) undoes it.
    if (pending >= 0) q.splice(pending, 1);
    else if (snapshot.loggedUsual.includes(meal.recordId)) return { snapshot, queue: q };
    else q.push({ ...base, type: 'usual', recordId: meal.recordId, mealType: meal.mealType });
    const add = (m: { value: number; target: number }, v: number) => ({
      ...m,
      value: Math.max(0, m.value + sign * v),
    });
    return {
      snapshot: {
        ...snapshot,
        consumedKcal: Math.max(0, snapshot.consumedKcal + sign * meal.kcal),
        protein: add(snapshot.protein, meal.protein),
        carbs: add(snapshot.carbs, meal.carbs),
        fat: add(snapshot.fat, meal.fat),
        loggedUsual:
          sign > 0
            ? [...snapshot.loggedUsual, meal.recordId]
            : snapshot.loggedUsual.filter((id) => id !== meal.recordId),
      },
      queue: q,
    };
  }

  return { snapshot, queue: q };
}
