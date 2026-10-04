import {
  CoachRequestSchema,
  localDate,
  MealPlanRequestSchema,
  type CoachResponse,
} from '../shared/index.ts';
import { estimateCostUsd } from '../ai/cost.ts';
import { AIError, type ImageInput } from '../ai/types.ts';
import type { ServerDeps } from '../deps.ts';
import {
  assertOwnPath,
  checkBudget,
  consumeQuota,
  quotaPayload,
  rateLimit,
  RATE_LIMITS,
  requireUser,
  toBase64,
} from '../guards.ts';
import { HttpError, json, parseBody } from '../http.ts';
import { aiErrorToHttp, MEAL_PHOTOS_BUCKET } from './analyzeMeal.ts';

/** POST /coach-chat — premium (free users get one lifetime trial message). */
export async function coachChat(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const body = await parseBody(req, CoachRequestSchema);
  await rateLimit(deps, `ai:${user.id}`, RATE_LIMITS.ai.max, RATE_LIMITS.ai.windowSeconds);
  const [profile, plan] = await Promise.all([deps.db.profile(user.id), deps.db.plan(user.id)]);
  if (body.photo_path && plan !== 'premium')
    throw new HttpError(403, 'PREMIUM_REQUIRED', { feature: body.photo_kind ?? 'photo' });
  await checkBudget(deps, plan);
  const ticket = await consumeQuota(deps, user.id, plan, 'coach_message', profile.timezone);

  let image: ImageInput | undefined;
  if (body.photo_path) {
    assertOwnPath(user.id, body.photo_path);
    const file = await deps.storage.download(MEAL_PHOTOS_BUCKET, body.photo_path);
    if (file) image = { base64: toBase64(file.bytes), mediaType: 'image/jpeg' };
    await deps.storage.remove(MEAL_PHOTOS_BUCKET, [body.photo_path]).catch(() => undefined);
  }

  const today = localDate(deps.now(), profile.timezone);
  const context = await deps.db.coachContext(user.id, today);
  const model = deps.config.aiModelPremium;
  try {
    const { data, usage } = await deps.ai.coach(
      {
        context,
        messages: body.messages,
        image,
        ctx: {
          locale: body.locale,
          country: profile.country,
          dietaryPreferences: profile.dietaryPreferences,
          allergies: profile.allergies,
        },
      },
      model,
    );
    await deps.db.insertScan({
      user_id: user.id,
      kind: image ? (body.photo_kind ?? 'fridge') : 'coach',
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
      status: 'ok',
      error: null,
      image_sha256: null,
      result: null, // conversations are not stored server-side
    });
    const response: CoachResponse = { reply: data, quota: quotaPayload(ticket) };
    return json(response);
  } catch (e) {
    await deps.db.refundQuota(user.id, 'coach_message', ticket.day, ticket.bucket);
    throw aiErrorToHttp(e instanceof AIError ? e : new AIError('upstream', String(e)));
  }
}

/** POST /meal-plan — premium only; counts against the coach quota. */
export async function mealPlan(req: Request, deps: ServerDeps): Promise<Response> {
  const user = await requireUser(req, deps);
  const body = await parseBody(req, MealPlanRequestSchema);
  await rateLimit(deps, `plan:${user.id}`, 3, 3600);
  const [profile, plan] = await Promise.all([deps.db.profile(user.id), deps.db.plan(user.id)]);
  if (plan !== 'premium') throw new HttpError(403, 'PREMIUM_REQUIRED', { feature: 'meal_plan' });
  await checkBudget(deps, plan);
  const ticket = await consumeQuota(deps, user.id, plan, 'coach_message', profile.timezone);
  const context = await deps.db.coachContext(user.id, localDate(deps.now(), profile.timezone));
  try {
    const { data, usage } = await deps.ai.mealPlan(
      {
        context,
        budget: body.budget,
        days: body.days,
        ctx: {
          locale: body.locale,
          country: profile.country,
          dietaryPreferences: profile.dietaryPreferences,
          allergies: profile.allergies,
        },
      },
      deps.config.aiModelPremium,
    );
    await deps.db.insertScan({
      user_id: user.id,
      kind: 'meal_plan',
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
      status: 'ok',
      error: null,
      image_sha256: null,
      result: null,
    });
    return json({ plan: data, quota: quotaPayload(ticket) });
  } catch (e) {
    await deps.db.refundQuota(user.id, 'coach_message', ticket.day, ticket.bucket);
    throw aiErrorToHttp(e instanceof AIError ? e : new AIError('upstream', String(e)));
  }
}
