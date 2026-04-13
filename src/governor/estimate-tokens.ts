import type { PackResult } from "../types/index.js";

const TOKEN_CHAR_RATIO = 4;
const SYSTEM_OVERHEAD_TOKENS = 200;
const HIGH_TOKEN_WARNING_THRESHOLD = 8000;
const INPUT_COST_PER_TOKEN = 0.000003;

export function estimateTokens(pack: PackResult): number {
  const excerptChars = pack.fragments.reduce((total, fragment) => {
    return total + fragment.excerpt.length;
  }, 0);

  return Math.ceil(excerptChars / TOKEN_CHAR_RATIO) + SYSTEM_OVERHEAD_TOKENS;
}

export function estimateCostUsd(tokens: number): number {
  return tokens * INPUT_COST_PER_TOKEN;
}

export function isHighTokenEstimate(tokens: number): boolean {
  return tokens > HIGH_TOKEN_WARNING_THRESHOLD;
}
