import {
  mockAnalyzeImage,
  mockAnalyzeText,
  mockCoachReply,
  mockMealPlan,
  mockReadLabel,
} from '../shared/index.ts';
import type { AIProvider, AIUsage } from './types.ts';

const usage = (model: string): AIUsage => ({
  model: `mock:${model}`,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  latencyMs: 5,
});

/** Canned responses (AI_MOCK=true or no ANTHROPIC_API_KEY). */
export class MockProvider implements AIProvider {
  analyzeMealImage: AIProvider['analyzeMealImage'] = async ({ image }, model) => ({
    data: mockAnalyzeImage(image.base64.slice(0, 256)),
    usage: usage(model),
  });
  analyzeMealText: AIProvider['analyzeMealText'] = async ({ text }, model) => ({
    data: mockAnalyzeText(text),
    usage: usage(model),
  });
  readLabel: AIProvider['readLabel'] = async (_input, model) => ({
    data: mockReadLabel(),
    usage: usage(model),
  });
  coach: AIProvider['coach'] = async ({ messages }, model) => ({
    data: mockCoachReply(messages[messages.length - 1]?.content ?? ''),
    usage: usage(model),
  });
  mealPlan: AIProvider['mealPlan'] = async ({ days }, model) => ({
    data: mockMealPlan(days),
    usage: usage(model),
  });
}
