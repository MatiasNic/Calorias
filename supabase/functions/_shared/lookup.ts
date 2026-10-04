import { normalizeText, type Food } from './shared/index.ts';
import type { ServerDeps } from './deps.ts';
import type { FoodLookup } from './enrich.ts';
import { searchUsda } from './usda.ts';

export const CACHE_TTL_DAYS = { usda: 30, off: 30, offMissing: 1 } as const;

const fresh = (fetchedAt: string, days: number, now: Date) =>
  now.getTime() - new Date(fetchedAt).getTime() < days * 86_400_000;

/** USDA search with a server-side cache keyed by normalized query (saves quota/latency). */
export async function usdaSearchCached(deps: ServerDeps, query: string): Promise<Food[]> {
  const key = `q:${normalizeText(query)}`;
  const cached = await deps.db.cacheGet('usda', key);
  if (cached && fresh(cached.fetchedAt, CACHE_TTL_DAYS.usda, deps.now()))
    return cached.payload as Food[];
  if (!deps.config.usdaApiKey) return [];
  const foods = await searchUsda(query, deps.config.usdaApiKey, deps.fetch);
  await deps.db.cacheSet('usda', key, foods);
  return foods;
}

export function foodLookup(deps: ServerDeps): FoodLookup {
  return {
    searchRegional: (q) => deps.db.searchRegional(q),
    searchUsda: (q) => usdaSearchCached(deps, q),
  };
}
