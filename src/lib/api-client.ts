import { ApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/store/auth-store';
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

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
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
export function createRun(
  presetId: string,
  gender: 'male' | 'female' = 'male',
  options?: { campaignId?: string; scenarioId?: string },
) {
  return request<Record<string, unknown>>('/v1/runs', {
    method: 'POST',
    body: JSON.stringify({ presetId, gender, ...options }),
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
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

/** GET /v1/runs/:runId — fetch current run state. */
export function getRun(runId: string, options?: { turnsLimit?: number }) {
  const params = options?.turnsLimit ? `?turnsLimit=${options.turnsLimit}` : '';
  return request<Record<string, unknown>>(`/v1/runs/${runId}${params}`);
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
      choices: Array<{
        id: string;
        label: string;
        hint?: string;
        action: { type: string; payload: Record<string, unknown> };
      }> | null;
    };
  }>(`/v1/runs/${runId}/turns/${turnNo}`);
}

/** POST /v1/runs/:runId/turns/:turnNo/retry-llm — retry failed LLM narrative. */
export function retryLlm(runId: string, turnNo: number) {
  return request<{ success: boolean; turnNo: number; llmStatus: string }>(
    `/v1/runs/${runId}/turns/${turnNo}/retry-llm`,
    { method: 'POST' },
  );
}

// --- LLM Usage ---

export interface LlmUsageTurn {
  turnNo: number;
  model: string | null;
  prompt: number;
  cached: number;
  completion: number;
  latencyMs: number;
}

export interface LlmUsageResponse {
  turns: LlmUsageTurn[];
  totals: { prompt: number; cached: number; completion: number; turns: number };
}

/** GET /v1/runs/:runId/turns/llm-usage — fetch LLM token usage for all turns in a run. */
export function getLlmUsage(runId: string) {
  return request<LlmUsageResponse>(`/v1/runs/${runId}/turns/llm-usage`);
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

// --- Campaigns ---

export interface CampaignResponse {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED';
  currentScenarioOrder: number;
  carryOverState: Record<string, unknown> | null;
  createdAt: string;
}

export interface ScenarioInfo {
  scenarioId: string;
  name: string;
  description: string;
  order: number;
  prerequisites: string[];
}

/** POST /v1/campaigns — create a new campaign. */
export function createCampaign(name: string) {
  return request<CampaignResponse>('/v1/campaigns', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/** GET /v1/campaigns — fetch active campaign (or null). */
export async function getActiveCampaign(): Promise<CampaignResponse | null> {
  try {
    return await request<CampaignResponse>('/v1/campaigns');
  } catch {
    return null;
  }
}

/** GET /v1/campaigns/:id — fetch campaign detail. */
export function getCampaign(campaignId: string) {
  return request<CampaignResponse>(`/v1/campaigns/${campaignId}`);
}

/** GET /v1/campaigns/:id/scenarios — fetch available scenarios. */
export function getAvailableScenarios(campaignId: string) {
  return request<ScenarioInfo[]>(`/v1/campaigns/${campaignId}/scenarios`);
}

// --- Scene Image ---

export interface SceneImageResponse {
  imageUrl: string;
  remainingCount: number;
  cached: boolean;
}

export interface SceneImageStatusResponse {
  totalGenerated: number;
  maxAllowed: number;
  remaining: number;
}

/** POST /v1/runs/:runId/turns/:turnNo/scene-image — generate a scene image for a turn. */
export function generateSceneImage(runId: string, turnNo: number) {
  return request<SceneImageResponse>(
    `/v1/runs/${runId}/turns/${turnNo}/scene-image`,
    { method: 'POST' },
  );
}

/** GET /v1/scene-images/status — fetch scene image generation quota status. */
export function getSceneImageStatus() {
  return request<SceneImageStatusResponse>('/v1/scene-images/status');
}

/** GET /v1/runs/:runId/scene-images — list all generated scene images for a run. */
export function listSceneImages(runId: string) {
  return request<Array<{ turnNo: number; imageUrl: string }>>(`/v1/runs/${runId}/scene-images`);
}

// --- Bug Report ---

/** POST /v1/runs/:runId/bug-report — submit an in-game bug report. */
export function submitBugReport(
  runId: string,
  body: {
    category: string;
    description?: string;
    recentTurns: Array<{
      turnNo: number;
      nodeType: string | null;
      messages: Array<{ type: string; text: string }>;
    }>;
  },
) {
  return request<{ success: boolean }>(`/v1/runs/${runId}/bug-report`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
