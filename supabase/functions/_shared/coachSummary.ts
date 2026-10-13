/** Pure helpers that turn DB rows into short lines for the coach's user summary. */

export interface WorkoutSummaryRow {
  duration_min: number | string;
  kcal: number | string;
}

export interface SupplementSummaryRow {
  name: string;
}

const MAX_SUPPLEMENT_NAMES = 8;
const MAX_NAME_CHARS = 40;

/** User-typed names go into the prompt: keep them on one short line. */
const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_CHARS);

/** "Training last 7 days: …" + "Supplements: …" summary line. */
export function trainingSummaryLine(
  workouts: readonly WorkoutSummaryRow[],
  supplements: readonly SupplementSummaryRow[],
): string {
  const minutes = workouts.reduce((s, w) => s + Number(w.duration_min || 0), 0);
  const kcal = workouts.reduce((s, w) => s + Number(w.kcal || 0), 0);
  const training = workouts.length
    ? `Training last 7 days: ${workouts.length} sessions, ${Math.round(minutes)} min, ${Math.round(kcal)} kcal burned.`
    : 'Training last 7 days: none logged.';
  const names = supplements.map((s) => cleanName(s.name)).filter(Boolean);
  const shown = names.slice(0, MAX_SUPPLEMENT_NAMES);
  const more = names.length > shown.length ? ` (+${names.length - shown.length} more)` : '';
  const supps = names.length ? `Supplements: ${shown.join(', ')}${more}.` : 'Supplements: none.';
  return `${training} ${supps}`;
}

export interface TodayMealRow {
  id: string;
  meal_type: string;
}

export interface TodayItemRow {
  meal_id: string;
  display_name: string;
}

const MAX_ITEMS_PER_MEAL = 6;

/** "Eaten today: lunch: arroz, pollo; snack: yogur." (user-typed names, kept short). */
export function todayMealsLine(
  meals: readonly TodayMealRow[],
  items: readonly TodayItemRow[],
): string {
  if (!meals.length) return 'Eaten today: nothing logged yet.';
  const byType = new Map<string, string[]>();
  for (const m of meals) {
    const names = items.filter((i) => i.meal_id === m.id).map((i) => cleanName(i.display_name));
    byType.set(m.meal_type, [...(byType.get(m.meal_type) ?? []), ...names]);
  }
  const parts = [...byType].map(([type, names]) => {
    const shown = names.filter(Boolean).slice(0, MAX_ITEMS_PER_MEAL);
    const more = names.length > shown.length ? ` (+${names.length - shown.length})` : '';
    return `${type}: ${shown.join(', ') || '—'}${more}`;
  });
  return `Eaten today: ${parts.join('; ')}.`;
}
