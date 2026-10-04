import { AnalyzeTextRequestSchema, type AnalyzeResponse } from '../shared/index.ts';
import { estimateCostUsd } from '../ai/cost.ts';
import { AIError } from '../ai/types.ts';
import type { ServerDeps } from '../deps.ts';
import { enrichItems } from '../enrich.ts';
import {
  checkBudget,
  consumeQuota,
  quotaPayload,
  rateLimit,
  RATE_LIMITS,
  requireUser,
} from '../guards.ts';
import { json, parseBody } from '../http.ts';
import { foodLookup } from '../lookup.ts';
import { aiErrorToHttp } from './analyzeMeal.ts';

/** POST /analyze-text — "dos empanadas de carne y una coca zero" → same review payload as photos. */
export async function analyzeText(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const body = await parseBody(req, AnalyzeTextRequestSchema);
  await rateLimit(deps, `ai:${user.id}`, RATE_LIMITS.ai.max, RATE_LIMITS.ai.windowSeconds);
  const [profile, plan] = await Promise.all([deps.db.profile(user.id), deps.db.plan(user.id)]);
  await checkBudget(deps, plan);
  const ticket = await consumeQuota(deps, user.id, plan, 'text_query', profile.timezone);
  const model = plan === 'premium' ? deps.config.aiModelPremium : deps.config.aiModelFree;
  const ctx = {
    locale: body.locale,
    country: profile.country,
    dietaryPreferences: profile.dietaryPreferences,
    allergies: profile.allergies,
  };

  try {
    const { data, usage } = await deps.ai.analyzeMealText({ text: body.text, ctx }, model);
    const items = data.is_food ? await enrichItems(data.items, foodLookup(deps)) : [];
    if (!data.is_food) await deps.db.refundQuota(user.id, 'text_query', ticket.day, ticket.bucket);
    const payload: Omit<AnalyzeResponse, 'scan_id' | 'cached'> = {
      is_food: data.is_food,
      dish_name: data.dish_name,
      items,
      hidden_ingredients_question: data.hidden_ingredients_question,
      notes: data.notes,
      model: usage.model,
      quota: quotaPayload(data.is_food ? ticket : { ...ticket, used: ticket.used - 1 }),
    };
    const scanId = await deps.db.insertScan({
      user_id: user.id,
      kind: body.source === 'recipe' ? 'recipe' : 'text',
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: estimateCostUsd(
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.cacheReadTokens,
      ),
      latency_ms: usage.latencyMs,
      status: data.is_food ? 'ok' : 'not_food',
      error: null,
      image_sha256: null,
      result: payload,
    });
    return json({ ...payload, scan_id: scanId, cached: false } satisfies AnalyzeResponse);
  } catch (e) {
    await deps.db.refundQuota(user.id, 'text_query', ticket.day, ticket.bucket);
    const err = e instanceof AIError ? e : new AIError('upstream', String(e));
    await deps.db.insertScan({
      user_id: user.id,
      kind: 'text',
      model,
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: 0,
      latency_ms: null,
      status: err.kind === 'timeout' ? 'timeout' : 'error',
      error: err.message.slice(0, 500),
      image_sha256: null,
      result: null,
    });
    throw aiErrorToHttp(err);
  }
}
