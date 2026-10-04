import type { AiAnalysis, AiLabel, AppLocale, MealPlan, MealType } from '../shared/index.ts';

export interface ImageInput {
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface AIUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  latencyMs: number;
}

export interface AIResult<T> {
  data: T;
  usage: AIUsage;
}

export interface UserContext {
  locale: AppLocale;
  country: string;
  dietaryPreferences: string[];
  allergies: string[];
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/**
 * Provider abstraction: swap model vendor/version without touching the app or handlers.
 * Implementations: AnthropicProvider (production) and MockProvider (AI_MOCK / tests).
 */
export interface AIProvider {
  analyzeMealImage(
    input: { image: ImageInput; ctx: UserContext; mealType?: MealType },
    model: string,
  ): Promise<AIResult<AiAnalysis>>;
  analyzeMealText(
    input: { text: string; ctx: UserContext },
    model: string,
  ): Promise<AIResult<AiAnalysis>>;
  readLabel(
    input: { image: ImageInput; ctx: UserContext },
    model: string,
  ): Promise<AIResult<AiLabel>>;
  coach(
    input: { context: string; messages: ChatTurn[]; image?: ImageInput; ctx: UserContext },
    model: string,
  ): Promise<AIResult<string>>;
  mealPlan(
    input: { context: string; ctx: UserContext; budget: 'low' | 'mid' | 'high'; days: number },
    model: string,
  ): Promise<AIResult<MealPlan>>;
}

export class AIError extends Error {
  constructor(
    public kind: 'timeout' | 'invalid' | 'refusal' | 'upstream',
    message?: string,
    public usage?: AIUsage,
  ) {
    super(message ?? kind);
  }
}
