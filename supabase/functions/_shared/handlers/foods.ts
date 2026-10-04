import { z } from 'zod';

import type { Food } from '../shared/index.ts';
import type { ServerDeps } from '../deps.ts';
import { rateLimit, RATE_LIMITS, requireUser } from '../guards.ts';
import { HttpError, json, parseBody } from '../http.ts';
import { CACHE_TTL_DAYS, usdaSearchCached } from '../lookup.ts';
import { fetchOffProduct, normalizeOffProduct } from '../off.ts';

const BarcodeSchema = z.object({
  barcode: z.string().regex(/^\d{6,14}$/),
  locale: z.string().max(5).optional(),
});
const SearchSchema = z.object({ query: z.string().trim().min(2).max(80) });

/** POST /barcode-lookup — Open Food Facts with server cache (misses cached for 1 day). */
export async function barcodeLookup(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const { barcode, locale } = await parseBody(req, BarcodeSchema);
  await rateLimit(
    deps,
    `lookup:${user.id}`,
    RATE_LIMITS.lookup.max,
    RATE_LIMITS.lookup.windowSeconds,
  );

  const cached = await deps.db.cacheGet('off', barcode);
  if (cached) {
    const age = deps.now().getTime() - new Date(cached.fetchedAt).getTime();
    const food = cached.payload as Food | null;
    const ttl = (food ? CACHE_TTL_DAYS.off : CACHE_TTL_DAYS.offMissing) * 86_400_000;
    if (age < ttl) return json({ food, cached: true });
  }
  let product;
  try {
    product = await fetchOffProduct(barcode, deps.fetch);
  } catch {
    throw new HttpError(502, 'INTERNAL', { upstream: 'off' });
  }
  const food = product ? normalizeOffProduct(product, barcode, locale ?? 'es') : null;
  await deps.db.cacheSet('off', barcode, food);
  return json({ food, cached: false });
}

/** POST /food-search — USDA FoodData Central proxy (API key stays on the server). */
export async function foodSearch(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const { query } = await parseBody(req, SearchSchema);
  await rateLimit(
    deps,
    `lookup:${user.id}`,
    RATE_LIMITS.lookup.max,
    RATE_LIMITS.lookup.windowSeconds,
  );
  try {
    return json({ foods: await usdaSearchCached(deps, query) });
  } catch {
    throw new HttpError(502, 'INTERNAL', { upstream: 'usda' });
  }
}
