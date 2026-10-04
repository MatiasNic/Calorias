/**
 * USD per million tokens (Anthropic first-party pricing, verified 2026-10-04).
 * Update together with docs/COSTS.md when prices change.
 */
export const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheRead: 0.1 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
};
const FALLBACK = { input: 4, output: 20, cacheRead: 0.4 };

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
): number {
  const p = MODEL_PRICING[model] ?? FALLBACK;
  const cost =
    (inputTokens * p.input + outputTokens * p.output + cacheReadTokens * p.cacheRead) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
