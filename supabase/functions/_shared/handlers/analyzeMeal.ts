import {
  AiAnalysisSchema,
  AnalyzeMealRequestSchema,
  type AiAnalysis,
  type AiLabel,
  type AnalyzeResponse,
  type LabelResponse,
} from '../shared/index.ts';
import { estimateCostUsd } from '../ai/cost.ts';
import { AIError, type AIResult, type ImageInput } from '../ai/types.ts';
import type { ServerDeps } from '../deps.ts';
import { enrichItems } from '../enrich.ts';
import {
  assertOwnPath,
  checkBudget,
  consumeQuota,
  DEDUP_WINDOW_DAYS,
  MAX_IMAGE_BYTES,
  quotaPayload,
  rateLimit,
  RATE_LIMITS,
  requireUser,
  toBase64,
} from '../guards.ts';
import { HttpError, json, parseBody } from '../http.ts';
import { foodLookup } from '../lookup.ts';

export const MEAL_PHOTOS_BUCKET = 'meal-photos';

export function aiErrorToHttp(e: AIError): HttpError {
  switch (e.kind) {
    case 'timeout':
      return new HttpError(504, 'AI_TIMEOUT');
    case 'invalid':
    case 'refusal':
      return new HttpError(502, 'AI_INVALID_RESPONSE');
    default:
      return new HttpError(502, 'AI_TIMEOUT', { upstream: true });
  }
}

/**
 * POST /analyze-meal — photo → items, grams, nutrients.
 * Order matters: auth → validate → rate limit → dedup (free) → budget → quota → AI → enrich → log.
 */
export async function analyzeMeal(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const body = await parseBody(req, AnalyzeMealRequestSchema);
  assertOwnPath(user.id, body.photo_path);
  await rateLimit(deps, `ai:${user.id}`, RATE_LIMITS.ai.max, RATE_LIMITS.ai.windowSeconds);

  const [profile, plan] = await Promise.all([deps.db.profile(user.id), deps.db.plan(user.id)]);
  const kind = body.mode === 'label' ? 'label' : 'photo';
  const keepPhoto = body.keep_photo && profile.savePhotos;
  const cleanup = async () => {
    if (!keepPhoto)
      await deps.storage.remove(MEAL_PHOTOS_BUCKET, [body.photo_path]).catch(() => undefined);
  };

  // Dedup: the same image analyzed before is returned without consuming quota.
  const since = new Date(deps.now().getTime() - DEDUP_WINDOW_DAYS * 86_400_000).toISOString();
  const cached = await deps.db.findScanByHash(user.id, body.image_sha256, kind, since);
  if (cached) {
    await cleanup();
    return json({ ...(cached.result as object), scan_id: cached.id, cached: true });
  }

  await checkBudget(deps, plan);
  const ticket = await consumeQuota(deps, user.id, plan, 'photo_scan', profile.timezone);

  const file = await deps.storage.download(MEAL_PHOTOS_BUCKET, body.photo_path);
  if (!file) {
    await deps.db.refundQuota(user.id, 'photo_scan', ticket.day, ticket.bucket);
    throw new HttpError(404, 'NOT_FOUND', { reason: 'photo' });
  }
  if (file.bytes.byteLength > MAX_IMAGE_BYTES) {
    await deps.db.refundQuota(user.id, 'photo_scan', ticket.day, ticket.bucket);
    throw new HttpError(400, 'INVALID_INPUT', { reason: 'image_too_large' });
  }
  const mediaType = (
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mediaType)
      ? file.mediaType
      : 'image/jpeg'
  ) as ImageInput['mediaType'];
  const image: ImageInput = { base64: toBase64(file.bytes), mediaType };
  const model = plan === 'premium' ? deps.config.aiModelPremium : deps.config.aiModelFree;
  const ctx = {
    locale: body.locale,
    country: profile.country,
    dietaryPreferences: profile.dietaryPreferences,
    allergies: profile.allergies,
  };

  let result: AIResult<AiAnalysis> | AIResult<AiLabel>;
  try {
    result =
      kind === 'label'
        ? await deps.ai.readLabel({ image, ctx }, model)
        : await deps.ai.analyzeMealImage({ image, ctx, mealType: body.meal_type }, model);
  } catch (e) {
    await deps.db.refundQuota(user.id, 'photo_scan', ticket.day, ticket.bucket);
    const err = e instanceof AIError ? e : new AIError('upstream', String(e));
    await deps.db.insertScan({
      user_id: user.id,
      kind,
      model,
      input_tokens: err.usage?.inputTokens ?? 0,
      output_tokens: err.usage?.outputTokens ?? 0,
      cost_usd: err.usage
        ? estimateCostUsd(
            err.usage.model,
            err.usage.inputTokens,
            err.usage.outputTokens,
            err.usage.cacheReadTokens,
          )
        : 0,
      latency_ms: err.usage?.latencyMs ?? null,
      status:
        err.kind === 'timeout'
          ? 'timeout'
          : err.kind === 'invalid' || err.kind === 'refusal'
            ? 'invalid_response'
            : 'error',
      error: `${err.kind}: ${err.message}`.slice(0, 500),
      image_sha256: body.image_sha256,
      result: null,
    });
    await cleanup();
    throw aiErrorToHttp(err);
  }

  const { usage } = result;
  const cost = estimateCostUsd(
    usage.model,
    usage.inputTokens,
    usage.outputTokens,
    usage.cacheReadTokens,
  );

  if (kind === 'label') {
    const label = result.data as AiLabel;
    const scanId = await deps.db.insertScan({
      user_id: user.id,
      kind,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: cost,
      latency_ms: usage.latencyMs,
      status: label.is_label ? 'ok' : 'not_food',
      error: null,
      image_sha256: body.image_sha256,
      result: { label },
    });
    if (!label.is_label)
      await deps.db.refundQuota(user.id, 'photo_scan', ticket.day, ticket.bucket);
    await cleanup();
    const response: LabelResponse = { scan_id: scanId, label, quota: quotaPayload(ticket) };
    return json(response);
  }

  const analysis = AiAnalysisSchema.parse(result.data);
  const items = analysis.is_food ? await enrichItems(analysis.items, foodLookup(deps)) : [];
  // Not food: the user is not charged (rate limits still protect against abuse).
  if (!analysis.is_food)
    await deps.db.refundQuota(user.id, 'photo_scan', ticket.day, ticket.bucket);

  const payload: Omit<AnalyzeResponse, 'scan_id' | 'cached'> = {
    is_food: analysis.is_food,
    dish_name: analysis.dish_name,
    items,
    hidden_ingredients_question: analysis.hidden_ingredients_question,
    notes: analysis.notes,
    model: usage.model,
    quota: analysis.is_food
      ? quotaPayload(ticket)
      : quotaPayload({ ...ticket, used: ticket.used - 1 }),
  };
  const scanId = await deps.db.insertScan({
    user_id: user.id,
    kind,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cost_usd: cost,
    latency_ms: usage.latencyMs,
    status: analysis.is_food ? 'ok' : 'not_food',
    error: null,
    image_sha256: body.image_sha256,
    result: payload,
  });
  await cleanup();
  const response: AnalyzeResponse = { ...payload, scan_id: scanId, cached: false };
  return json(response);
}
