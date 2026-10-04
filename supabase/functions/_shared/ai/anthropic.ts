import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

import { AiAnalysisSchema, AiLabelSchema, MealPlanSchema } from '../shared/index.ts';
import {
  coachSystem,
  fridgePrompt,
  labelSystem,
  mealImageSystem,
  mealPlanSystem,
  mealTextSystem,
} from './prompts.ts';
import { AIError, type AIProvider, type AIResult, type AIUsage, type ImageInput } from './types.ts';

const TIMEOUT_MS = 25_000;

type Content = Anthropic.ContentBlockParam[];

/** Models that accept output_config.effort (Haiku 4.5 does not). */
const supportsEffort = (model: string) => !model.startsWith('claude-haiku');

function imageBlock(image: ImageInput): Anthropic.ImageBlockParam {
  return {
    type: 'image',
    source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
  };
}

/**
 * Claude provider. Structured outputs (`output_config.format`, validated with Zod) instead of
 * forced tool use, which current models reject. Refusals fall back once to the economy model.
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(
    apiKey: string,
    private fallbackModel: string,
  ) {
    // SDK retries 408/409/429/5xx and connection errors once with exponential backoff.
    this.client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
  }

  private usageOf(model: string, started: number, u: Anthropic.Usage): AIUsage {
    return {
      model,
      inputTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
      outputTokens: u.output_tokens ?? 0,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }

  private async structured<T>(
    model: string,
    system: string,
    content: Content,
    schema: z.ZodType<T>,
    maxTokens: number,
    allowFallback = true,
  ): Promise<AIResult<T>> {
    const started = Date.now();
    let response;
    try {
      response = await this.client.messages.parse({
        model,
        max_tokens: maxTokens,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
        output_config: {
          format: zodOutputFormat(schema as z.ZodType<T> & z.ZodObject),
          ...(supportsEffort(model) ? { effort: 'low' as const } : {}),
        },
      });
    } catch (e) {
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AIError('timeout');
      if (e instanceof Anthropic.APIError) throw new AIError('upstream', `${e.status}`);
      throw new AIError('invalid', e instanceof Error ? e.message : String(e));
    }
    const usage = this.usageOf(model, started, response.usage);
    if (response.stop_reason === 'refusal') {
      if (allowFallback && model !== this.fallbackModel) {
        const retry = await this.structured(
          this.fallbackModel,
          system,
          content,
          schema,
          maxTokens,
          false,
        );
        return {
          data: retry.data,
          usage: {
            ...retry.usage,
            inputTokens: retry.usage.inputTokens + usage.inputTokens,
            outputTokens: retry.usage.outputTokens + usage.outputTokens,
          },
        };
      }
      throw new AIError('refusal', undefined, usage);
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output)
      throw new AIError('invalid', 'unparseable', usage);
    const parsed = schema.safeParse(response.parsed_output);
    if (!parsed.success) throw new AIError('invalid', 'schema', usage);
    return { data: parsed.data, usage };
  }

  analyzeMealImage: AIProvider['analyzeMealImage'] = ({ image, ctx, mealType }, model) =>
    this.structured(
      model,
      mealImageSystem(ctx),
      [
        imageBlock(image),
        {
          type: 'text',
          text: mealType ? `Meal type: ${mealType}. Analyze this meal.` : 'Analyze this meal.',
        },
      ],
      AiAnalysisSchema,
      4096,
    );

  analyzeMealText: AIProvider['analyzeMealText'] = ({ text, ctx }, model) =>
    this.structured(
      model,
      mealTextSystem(ctx),
      [{ type: 'text', text: `What I ate: """${text}"""` }],
      AiAnalysisSchema,
      3072,
    );

  readLabel: AIProvider['readLabel'] = ({ image, ctx }, model) =>
    this.structured(
      model,
      labelSystem(ctx),
      [imageBlock(image), { type: 'text', text: 'Read this nutrition label.' }],
      AiLabelSchema,
      2048,
    );

  mealPlan: AIProvider['mealPlan'] = ({ context, ctx, budget, days }, model) =>
    this.structured(
      model,
      mealPlanSystem(ctx, context, budget, days),
      [{ type: 'text', text: 'Create my meal plan.' }],
      MealPlanSchema,
      12000,
    );

  coach: AIProvider['coach'] = async ({ context, messages, image, ctx }, model) => {
    const started = Date.now();
    const history: Anthropic.MessageParam[] = messages.map((m, i) => {
      const isLast = i === messages.length - 1;
      if (isLast && image && m.role === 'user') {
        return {
          role: 'user',
          content: [imageBlock(image), { type: 'text', text: m.content || fridgePrompt('fridge') }],
        };
      }
      return { role: m.role, content: m.content };
    });
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 2048,
        system: [{ type: 'text', text: coachSystem(ctx, context) }],
        messages: history,
        ...(supportsEffort(model) ? { output_config: { effort: 'low' as const } } : {}),
      });
      const usage = this.usageOf(model, started, response.usage);
      if (response.stop_reason === 'refusal') throw new AIError('refusal', undefined, usage);
      const text = response.content
        .flatMap((b) => (b.type === 'text' ? [b.text] : []))
        .join('\n')
        .trim();
      if (!text) throw new AIError('invalid', 'empty', usage);
      return { data: text, usage };
    } catch (e) {
      if (e instanceof AIError) throw e;
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AIError('timeout');
      if (e instanceof Anthropic.APIError) throw new AIError('upstream', `${e.status}`);
      throw new AIError('upstream', e instanceof Error ? e.message : String(e));
    }
  };
}
