/** LLM 모델별 토큰 단가 (USD per 1M tokens) */

interface ModelPricing {
  input: number;
  cached: number;
  output: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { input: 2.5, cached: 1.25, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, cached: 0.075, output: 0.6 },
  'gpt-4.1': { input: 2.0, cached: 0.5, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, cached: 0.1, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, cached: 0.025, output: 0.4 },
  'o3': { input: 2.0, cached: 0.5, output: 8.0 },
  'o3-mini': { input: 1.1, cached: 0.55, output: 4.4 },
  'o4-mini': { input: 1.1, cached: 0.275, output: 4.4 },
  // Claude
  'claude-sonnet-4-5': { input: 3.0, cached: 0.3, output: 15.0 },
  'claude-opus-4': { input: 15.0, cached: 1.5, output: 75.0 },
  'claude-haiku-3-5': { input: 0.8, cached: 0.08, output: 4.0 },
  // Gemini
  'gemini-2.5-pro': { input: 1.25, cached: 0.315, output: 10.0 },
  'gemini-2.5-flash': { input: 0.15, cached: 0.0375, output: 0.6 },
  'gemini-2.0-flash': { input: 0.1, cached: 0.025, output: 0.4 },
};

const DEFAULT_PRICING: ModelPricing = { input: 2.5, cached: 1.25, output: 10.0 };

export const USD_TO_KRW = 1400;

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
