import { ApiError } from '@/lib/api-errors';
import type { SubmitTurnResponse } from '@/types/game';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const USER_ID = '00000000-0000-0000-0000-000000000001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
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
export function createRun() {
  return request<Record<string, unknown>>('/v1/runs', { method: 'POST' });
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

/** GET /v1/runs/:runId/turns/:turnNo — fetch turn detail (LLM narrative polling). */
export function getTurnDetail(runId: string, turnNo: number) {
  return request<{
    llm: { status: string; output: string | null; modelUsed: string | null };
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
