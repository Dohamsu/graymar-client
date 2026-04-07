import { ApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/store/auth-store';
import type { SubmitTurnResponse } from '@/types/game';
import type {
  PartyInfo,
  PartyMember,
  ChatMessage,
  PartySearchResult,
} from '@/types/party';

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
  options?: {
    campaignId?: string;
    scenarioId?: string;
    characterName?: string;
    bonusStats?: Record<string, number>;
    traitId?: string;
    portraitUrl?: string;
  },
) {
  return request<Record<string, unknown>>('/v1/runs', {
    method: 'POST',
    body: JSON.stringify({ presetId, gender, ...options }),
  });
}

/** POST /v1/portrait/generate — generate a character portrait via AI. */
export function generatePortrait(presetId: string, gender: string, appearanceDescription: string) {
  return request<{ imageUrl: string; promptUsed: string }>('/v1/portrait/generate', {
    method: 'POST',
    body: JSON.stringify({ presetId, gender, appearanceDescription }),
  });
}

/** POST /v1/portrait/upload — upload and process a character portrait image. */
export async function uploadPortrait(file: File): Promise<{
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const token =
    typeof window !== 'undefined'
      ? document.cookie
          .split('; ')
          .find((c) => c.startsWith('graymar_token='))
          ?.split('=')[1] ?? ''
      : '';

  const res = await fetch(`${getBaseUrl()}/v1/portrait/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, string>).message ?? '이미지 업로드에 실패했습니다.',
    );
  }

  return res.json();
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

// --- Equipment / Item Actions ---

export interface EquipItemResponse {
  equipped: Record<string, { instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>;
  equipmentBag: Array<{ instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>;
  unequippedInstance?: { instanceId: string; baseItemId: string; displayName: string };
  message: string;
}

export interface UnequipItemResponse {
  equipped: Record<string, { instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>;
  equipmentBag: Array<{ instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>;
  message: string;
}

export interface UseItemResponse {
  hp: number;
  stamina: number;
  inventory: Array<{ itemId: string; qty: number }>;
  message: string;
}

/** POST /v1/runs/:runId/equip — equip an item from equipment bag. */
export function equipItem(runId: string, instanceId: string) {
  return request<EquipItemResponse>(`/v1/runs/${runId}/equip`, {
    method: 'POST',
    body: JSON.stringify({ instanceId }),
  });
}

/** POST /v1/runs/:runId/unequip — unequip an item from a slot. */
export function unequipItem(runId: string, slot: string) {
  return request<UnequipItemResponse>(`/v1/runs/${runId}/unequip`, {
    method: 'POST',
    body: JSON.stringify({ slot }),
  });
}

/** POST /v1/runs/:runId/use-item — use a consumable item. */
export function useItem(runId: string, itemId: string) {
  return request<UseItemResponse>(`/v1/runs/${runId}/use-item`, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
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

// ---------------------------------------------------------------------------
// Party API
// ---------------------------------------------------------------------------

/** POST /v1/parties — create a new party. */
/**
 * 서버 파티 응답은 flat 구조:
 * { id, name, leaderId, status, maxMembers, inviteCode, memberCount, members: [...], createdAt }
 * 이를 { party, members }로 분리하여 반환.
 */
function parsePartyResponse(data: Record<string, unknown>): {
  party: PartyInfo;
  members: PartyMember[];
} {
  const members = (data.members ?? []) as PartyMember[];
  return {
    party: {
      id: data.id as string,
      name: data.name as string,
      leaderId: data.leaderId as string,
      status: data.status as PartyInfo['status'],
      maxMembers: (data.maxMembers as number) ?? 4,
      inviteCode: (data.inviteCode as string) ?? '',
      createdAt: (data.createdAt as string) ?? '',
    },
    members,
  };
}

export async function createParty(name: string) {
  const data = await request<Record<string, unknown>>('/v1/parties', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return parsePartyResponse(data);
}

/** GET /v1/parties/my — fetch the current user's party (or null). */
export async function getMyParty(): Promise<{
  party: PartyInfo;
  members: PartyMember[];
} | null> {
  try {
    const data = await request<Record<string, unknown> | null>(
      '/v1/parties/my',
    );
    if (!data || !data.id) return null;
    return parsePartyResponse(data);
  } catch {
    return null;
  }
}

/** GET /v1/parties/search?q=... — search open parties. */
export function searchParties(query: string) {
  return request<PartySearchResult[]>(
    `/v1/parties/search?q=${encodeURIComponent(query)}`,
  );
}

/** POST /v1/parties/join — join a party by invite code. */
export async function joinParty(inviteCode: string) {
  const data = await request<Record<string, unknown>>(
    '/v1/parties/join',
    {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    },
  );
  return parsePartyResponse(data);
}

/** POST /v1/parties/:partyId/leave — leave the party. */
export function leaveParty(partyId: string) {
  return request<{ success: boolean }>(`/v1/parties/${partyId}/leave`, {
    method: 'POST',
  });
}

/** POST /v1/parties/:partyId/kick — kick a member (leader only). */
export function kickMember(partyId: string, userId: string) {
  return request<{ success: boolean }>(`/v1/parties/${partyId}/kick`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/** DELETE /v1/parties/:partyId — disband the party (leader only). */
export function disbandParty(partyId: string) {
  return request<{ success: boolean }>(`/v1/parties/${partyId}`, {
    method: 'DELETE',
  });
}

/** POST /v1/parties/:partyId/messages — send a chat message. */
export function sendChatMessage(partyId: string, content: string) {
  return request<ChatMessage>(`/v1/parties/${partyId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

/** GET /v1/parties/:partyId/messages — fetch chat message history. */
export function getChatMessages(
  partyId: string,
  cursor?: string,
  limit?: number,
) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return request<{ messages: ChatMessage[]; nextCursor: string | null }>(
    `/v1/parties/${partyId}/messages${qs ? `?${qs}` : ''}`,
  );
}

// ---------------------------------------------------------------------------
// Party Phase 2 — Lobby / Dungeon / Votes
// ---------------------------------------------------------------------------

import type {
  LobbyStateDTO,
  DungeonStartResult,
  PartyVoteDTO,
} from '@/types/party';

/** GET /v1/parties/:partyId/lobby — get lobby state. */
export function getLobbyState(partyId: string) {
  return request<LobbyStateDTO>(`/v1/parties/${partyId}/lobby`);
}

/** POST /v1/parties/:partyId/lobby/ready — toggle ready status. */
export function toggleReady(partyId: string, ready: boolean) {
  return request<LobbyStateDTO>(`/v1/parties/${partyId}/lobby/ready`, {
    method: 'POST',
    body: JSON.stringify({ ready }),
  });
}

/** POST /v1/parties/:partyId/lobby/start — start dungeon (leader only). */
export function startDungeon(partyId: string) {
  return request<DungeonStartResult>(`/v1/parties/${partyId}/lobby/start`, {
    method: 'POST',
  });
}

/** POST /v1/parties/:partyId/lobby/invite-run — invite to leader's existing run (Phase 3). */
export function inviteToRun(partyId: string) {
  return request<DungeonStartResult & { isRunIntegration: boolean }>(
    `/v1/parties/${partyId}/lobby/invite-run`,
    { method: 'POST' },
  );
}

/** POST /v1/parties/:partyId/runs/:runId/turns — submit party action. */
export function submitPartyAction(
  partyId: string,
  runId: string,
  inputType: 'ACTION' | 'CHOICE',
  rawInput: string,
  idempotencyKey: string,
) {
  return request<{ accepted: boolean; allSubmitted: boolean }>(
    `/v1/parties/${partyId}/runs/${runId}/turns`,
    {
      method: 'POST',
      body: JSON.stringify({ inputType, rawInput, idempotencyKey }),
    },
  );
}

/** POST /v1/parties/:partyId/votes — propose a movement vote. */
export function createVote(partyId: string, targetLocationId: string) {
  return request<PartyVoteDTO>(`/v1/parties/${partyId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ targetLocationId }),
  });
}

/** POST /v1/parties/:partyId/votes/:voteId/cast — cast a vote. */
export function castVote(
  partyId: string,
  voteId: string,
  choice: 'yes' | 'no',
) {
  return request<{ voteId: string; status: string }>(
    `/v1/parties/${partyId}/votes/${voteId}/cast`,
    {
      method: 'POST',
      body: JSON.stringify({ choice }),
    },
  );
}
