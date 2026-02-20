import { ApiError } from '@/lib/api-errors';
import type { SubmitTurnResponse } from '@/types/game';

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // SSR — 항상 직접 접속
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 로컬 개발 — 백엔드 직접 호출
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  // 외부 접속 (ngrok 등) — 상대경로로 Next.js rewrites 프록시 사용
  return '';
}

const USER_ID = '00000000-0000-0000-0000-000000000001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...init?.headers,
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.code ?? 'UNKNOWN',
      json.message ?? res.statusText,
    );
  }

  return json as T;
}

/** POST /v1/runs — create a new run and return the full run response. */
export function createRun(presetId: string, gender: 'male' | 'female' = 'male') {
  return request<Record<string, unknown>>('/v1/runs', {
    method: 'POST',
    body: JSON.stringify({ presetId, gender }),
  });
}

/** GET /v1/runs — fetch active run info (or null). */
export async function getActiveRun(): Promise<{
  runId: string;
  presetId: string;
  gender: 'male' | 'female';
  currentTurnNo: number;
  currentNodeIndex: number;
  startedAt: string;
} | null> {
  const res = await fetch(`${getBaseUrl()}/v1/runs`, {
    headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

/** GET /v1/runs/:runId — fetch current run state. */
export function getRun(runId: string) {
  return request<Record<string, unknown>>(`/v1/runs/${runId}`);
}

// --- LLM Settings ---

export interface LlmSettingsResponse {
  provider: string;
  openaiModel: string;
  openaiApiKeySet: boolean;
  claudeModel: string;
  claudeApiKeySet: boolean;
  geminiModel: string;
  geminiApiKeySet: boolean;
  maxRetries: number;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  fallbackProvider: string;
  availableProviders: string[];
}

/** GET /v1/settings/llm — fetch current LLM settings. */
export function getLlmSettings() {
  return request<LlmSettingsResponse>('/v1/settings/llm');
}

/** PATCH /v1/settings/llm — update LLM settings at runtime. */
export function updateLlmSettings(
  patch: Partial<{
    provider: string;
    openaiModel: string;
    claudeModel: string;
    geminiModel: string;
    maxTokens: number;
    temperature: number;
    fallbackProvider: string;
  }>,
) {
  return request<LlmSettingsResponse & { message: string }>(
    '/v1/settings/llm',
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
}

export interface LlmTokenStats {
  prompt: number;
  cached: number;
  completion: number;
  latencyMs: number;
}

/** GET /v1/runs/:runId/turns/:turnNo — fetch turn detail (LLM narrative polling). */
export function getTurnDetail(runId: string, turnNo: number) {
  return request<{
    llm: {
      status: string;
      output: string | null;
      modelUsed: string | null;
      tokenStats: LlmTokenStats | null;
      error: { error: string; provider?: string } | null;
    };
  }>(`/v1/runs/${runId}/turns/${turnNo}`);
}

/** POST /v1/runs/:runId/turns — submit a player turn. */
export function submitTurn(
  runId: string,
  body: {
    idempotencyKey: string;
    expectedNextTurnNo: number;
    input: {
      type: 'ACTION' | 'CHOICE';
      text?: string;
      choiceId?: string;
    };
    options?: { skipLlm?: boolean };
  },
) {
  return request<SubmitTurnResponse>(`/v1/runs/${runId}/turns`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
