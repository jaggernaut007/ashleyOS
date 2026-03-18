/**
 * Central AI configuration.
 * Use this to control which model powers code generation.
 */

import type { LanguageModelV2Usage } from '@ai-sdk/provider';

// Model used for coding/code generation tasks
export const CODING_MODEL = 'gpt-5.4-mini';
export const CODING_MODEL_OPTIONS = { reasoningEffort: 'low' as const };

export function summarizeUsage(usage?: LanguageModelV2Usage) {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.totalTokens ?? inputTokens + outputTokens,
    reasoningTokens: usage?.reasoningTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
  };
}
