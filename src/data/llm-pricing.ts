/** LLM 모델별 토큰 단가 (USD per 1M tokens) */

interface ModelPricing {
  input: number;
  cached: number;
  output: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI — GPT-5.4 계열
  'gpt-5.4': { input: 2.5, cached: 0.625, output: 15.0 },
  'gpt-5.4-mini': { input: 0.75, cached: 0.1875, output: 4.5 },
  'gpt-5.4-nano': { input: 0.20, cached: 0.02, output: 1.25 },
  // OpenAI — GPT-4.1 계열
  'gpt-4.1': { input: 2.0, cached: 0.5, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, cached: 0.1, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, cached: 0.025, output: 0.4 },
  // OpenAI — GPT-4o 계열
  'gpt-4o': { input: 2.5, cached: 1.25, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, cached: 0.075, output: 0.6 },
  // OpenAI — o-series
  'o3': { input: 2.0, cached: 0.5, output: 8.0 },
  'o3-mini': { input: 1.1, cached: 0.55, output: 4.4 },
  'o4-mini': { input: 1.1, cached: 0.275, output: 4.4 },
  // Claude
  'claude-sonnet-4-6': { input: 3.0, cached: 0.3, output: 15.0 },
  'claude-sonnet-4-5': { input: 3.0, cached: 0.3, output: 15.0 },
  'claude-opus-4': { input: 15.0, cached: 1.5, output: 75.0 },
  'claude-haiku-4-5': { input: 0.25, cached: 0.025, output: 1.25 },
  'claude-haiku-3-5': { input: 0.8, cached: 0.08, output: 4.0 },
  // Gemini
  'gemini-3.1-pro': { input: 2.0, cached: 0.5, output: 12.0 },
  'gemini-2.5-pro': { input: 1.25, cached: 0.315, output: 10.0 },
  'gemini-2.5-flash': { input: 0.30, cached: 0.075, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, cached: 0.01, output: 0.40 },
  'gemini-2.0-flash': { input: 0.1, cached: 0.025, output: 0.4 },
  // Gemma 4 (via Gemini API / OpenRouter)
  'gemma-4-31b-it': { input: 0.14, cached: 0.035, output: 0.40 },
  'gemma-4-26b-a4b-it': { input: 0.13, cached: 0.033, output: 0.40 },
  'gemma-4-e4b-it': { input: 0.07, cached: 0.018, output: 0.20 },
  'gemma-4-e2b-it': { input: 0.04, cached: 0.01, output: 0.10 },
  // Qwen3 (via OpenRouter)
  'qwen3-235b-a22b': { input: 0.071, cached: 0.018, output: 0.10 },
  'qwen3-next-80b-a3b': { input: 0.09, cached: 0.023, output: 1.10 },
  'qwen3-32b': { input: 0.08, cached: 0.02, output: 0.24 },
  'qwen3-30b-a3b': { input: 0.08, cached: 0.02, output: 0.28 },
  // Llama 4 (via OpenRouter)
  'llama-4-scout': { input: 0.08, cached: 0.02, output: 0.30 },
  'llama-4-maverick': { input: 0.15, cached: 0.04, output: 0.60 },
  // DeepSeek
  'deepseek-v3': { input: 0.28, cached: 0.14, output: 0.42 },
};

const DEFAULT_PRICING: ModelPricing = { input: 2.5, cached: 1.25, output: 10.0 };

export const USD_TO_KRW = 1500;

export function findPricing(model: string | null): ModelPricing {
  if (!model) return DEFAULT_PRICING;
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  // 부분 매칭: 긴 key부터 시도 (gpt-4o-mini가 gpt-4o보다 먼저)
  const sorted = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (model.includes(key)) return MODEL_PRICING[key];
  }
  return DEFAULT_PRICING;
}

/** 턴 비용 계산 (KRW) */
export function calcTurnCostKRW(
  model: string | null,
  prompt: number,
  cached: number,
  completion: number,
): number {
  const p = findPricing(model);
  const uncached = prompt - cached;
  const costUSD =
    (uncached / 1_000_000) * p.input +
    (cached / 1_000_000) * p.cached +
    (completion / 1_000_000) * p.output;
  return costUSD * USD_TO_KRW;
}

/** 한화 포맷 */
export function formatKRW(won: number): string {
  if (won < 0.01) return '0원';
  if (won < 1) return `${won.toFixed(2)}원`;
  if (won < 100) return `${won.toFixed(1)}원`;
  return `${Math.round(won).toLocaleString()}원`;
}
