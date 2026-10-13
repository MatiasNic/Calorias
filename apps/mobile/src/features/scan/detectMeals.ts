import type { MealType } from '@bocado/shared';

/**
 * Live preview while the user speaks or types: which meals the description mentions
 * ("desayuné café con leche y dos medialunas, y a la noche media milanesa") and the foods said
 * for each. Only a hint for the UI; the AI does the real split.
 */
export interface DetectedMeal {
  mealType: MealType;
  foods: string;
}

const MARKERS: { re: RegExp; meal: MealType }[] = [
  { re: /\b(?:desayun\p{L}*|breakfast|café da manhã|tomei café)(?![\p{L}])/iu, meal: 'breakfast' },
  {
    re: /\b(?:almorc\p{L}*|almorz\p{L}*|almuerz\p{L}*|al mediod[ií]a|lunch|almo[cç]\p{L}*)/iu,
    meal: 'lunch',
  },
  { re: /\b(?:merend\p{L}*|merienda|colaci[oó]n|snack|lanche)(?![\p{L}])/iu, meal: 'snack' },
  { re: /\b(?:cen[eéoa]\p{L}*|a la noche|de noche|dinner|jant\p{L}*)/iu, meal: 'dinner' },
];

const NUMBERS: Record<string, string> = {
  un: '1',
  una: '1',
  uno: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
};

const ALL = new RegExp(MARKERS.map((m) => m.re.source).join('|'), 'giu');

/** Words that only glue the sentence ("y", "comí", "tomé", "me comí") at the edges of a segment. */
const GLUE =
  /^(?:[\s,.;:]|y\b|e\b|después\b|despues\b|luego\b|para\b|de\b|me\b|comí\b|comi\b|tomé\b|tome\b|al\b|en\b|el\b|la\b)+|(?:[\s,.;:]|y\b|e\b|para\b|después\b|luego\b|a la\b|al\b)+$/giu;

function clean(segment: string): string {
  let s = segment;
  for (let i = 0; i < 3; i++) s = s.replace(GLUE, '');
  return s
    .split(/\s+/)
    .map((w) => NUMBERS[w.toLowerCase()] ?? w)
    .join(' ')
    .replace(/\s+y\s+/giu, ', ')
    .trim();
}

export function detectMeals(text: string): DetectedMeal[] {
  const marks = [...text.matchAll(ALL)];
  if (!marks.length) return [];
  const out: DetectedMeal[] = [];
  marks.forEach((m, i) => {
    const meal = MARKERS.find((x) => x.re.test(m[0]))!.meal;
    const from = m.index! + m[0].length;
    const to = marks[i + 1]?.index ?? text.length;
    const foods = clean(text.slice(from, to));
    const existing = out.find((x) => x.mealType === meal);
    if (existing) existing.foods = [existing.foods, foods].filter(Boolean).join(', ');
    else out.push({ mealType: meal, foods });
  });
  return out;
}
