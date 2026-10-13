import { scaleNutrients, sumNutrients, type CoachDish } from '@bocado/shared';

/** Nutrients of one portion of a proposed dish. */
export function dishTotals(dish: CoachDish) {
  return sumNutrients(dish.items.map((i) => scaleNutrients(i.per100g, i.grams)));
}

/** "a **b** c" → [["a ", false], ["b", true], [" c", false]]. */
export function boldRuns(line: string): [string, boolean][] {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? [part.slice(2, -2), true]
        : [part, false],
    );
}
