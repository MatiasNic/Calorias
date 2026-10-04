/** Accent/case-insensitive normalization used by food search on device and on the server. */
export const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Scores a query against candidate names: exact 100, prefix 80, word-prefix 60, substring 40, all tokens 30. */
export function matchScore(query: string, candidates: readonly string[]): number {
  const q = normalizeText(query);
  if (!q) return 0;
  const tokens = q.split(' ');
  let best = 0;
  for (const raw of candidates) {
    const c = normalizeText(raw);
    if (!c) continue;
    if (c === q) best = Math.max(best, 100);
    else if (c.startsWith(q)) best = Math.max(best, 80);
    else if (c.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 60);
    else if (c.includes(q)) best = Math.max(best, 40);
    else if (tokens.every((t) => c.includes(t))) best = Math.max(best, 30);
  }
  return best;
}
