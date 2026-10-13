import { normalizeText, type CookingMethod, type MealItem } from '@bocado/shared';

import { applyCookingMethod, isCookable } from '@/features/diary/cooking';
import { withGrams } from '@/features/diary/mealMath';

/**
 * Demo-mode stand-in for the AI correction ("era al horno y sin puré"): understands removals,
 * cooking methods, sizes and added oil. The real app sends the correction to `analyze-text`.
 */
const COOKING_WORDS: { re: RegExp; method: CookingMethod }[] = [
  { re: /\bal horno\b|\bhornead/, method: 'baked' },
  { re: /\bfrit[oa]s?\b|\bfrei/, method: 'fried' },
  { re: /\bplancha\b|\bparrilla\b|\bgrill/, method: 'grilled' },
  { re: /\bhervid|\bcocid/, method: 'boiled' },
];

const SIZE_WORDS: { re: RegExp; factor: number }[] = [
  { re: /\bmedia\b|\bmedio\b|\bmitad\b/, factor: 0.5 },
  { re: /\bdoble\b|\bdos porciones\b/, factor: 2 },
  { re: /\bchic[oa]\b|\bpoc[oa]\b/, factor: 0.75 },
  { re: /\bgrande\b|\bmucho\b|\bmucha\b/, factor: 1.35 },
];

const SPOONS: Record<string, number> = { una: 1, un: 1, '1': 1, dos: 2, '2': 2, tres: 3, '3': 3 };

/** Significant words of a food name ("Milanesa de carne frita" → milanesa, carne, frita). */
const words = (name: string) =>
  normalizeText(name)
    .split(/\s+/)
    .filter((w) => w.length >= 4);

const isMainCooked = (item: MealItem) =>
  isCookable(item) &&
  ['fried', 'deep_fried', 'baked', 'grilled', 'unknown'].includes(item.cooking_method ?? '');

const mentions = (text: string, item: MealItem) =>
  words(item.display_name).some((w) => text.includes(w.slice(0, Math.max(4, w.length - 1))));

export interface LocalCorrectionDeps {
  /** Foods parsed from free text (demo parser). */
  parse: (text: string) => MealItem[];
  /** A one-spoon oil item, when the user says they used oil. */
  oil: () => MealItem | null;
}

export function applyLocalCorrection(
  items: readonly MealItem[],
  text: string,
  deps: LocalCorrectionDeps,
): MealItem[] {
  const norm = normalizeText(text);
  // Removals: "sin puré", "no comí el pan", "sacá la gaseosa".
  const removed = [
    ...norm.matchAll(/\b(?:sin|saca|sacar|no comi|no habia)\s+(?:el |la |los |las )?([a-z]+)/g),
  ].map((m) => m[1]!);
  let next = items.filter(
    (i) =>
      !removed.some(
        (r) => r.length >= 3 && words(i.display_name).some((w) => w.startsWith(r.slice(0, 4))),
      ),
  );

  const cooking = COOKING_WORDS.find((c) => c.re.test(norm))?.method;
  const size = SIZE_WORDS.find((s) => s.re.test(norm))?.factor;
  const mentioned = next.filter((i) => mentions(norm, i));
  next = next.map((item) => {
    let out = item;
    // A cooking method without a food name refers to the fried/baked/grilled foods of the meal.
    if (cooking && (mentioned.length ? mentioned.includes(item) : isMainCooked(item)))
      out = { ...applyCookingMethod(out, cooking), user_edited: true };
    if (size && (mentioned.length ? mentioned.includes(item) : next.length === 1))
      out = { ...withGrams(out, out.grams * size), user_edited: true };
    return out;
  });

  // Oil: "2 cucharadas de aceite" / quick answer "1 cucharada".
  const spoons = norm.match(/\b(una|un|dos|tres|\d)\s+cucharadas?\b/);
  if (spoons && !/\bsin aceite\b/.test(norm)) {
    const oil = deps.oil();
    if (oil)
      next.push({ ...withGrams(oil, oil.grams * (SPOONS[spoons[1]!] ?? 1)), user_edited: true });
  }

  // Additions: foods mentioned that aren't in the list yet ("y también un flan").
  const withoutRemovals = norm.replace(/\b(?:sin|saca|sacar|no comi)\s+[a-z ]+?(?=,| y |$)/g, ' ');
  for (const added of deps.parse(withoutRemovals)) {
    const known = next.some((i) => words(i.display_name)[0] === words(added.display_name)[0]);
    if (!known) next.push({ ...added, user_edited: true });
  }
  return next;
}
