// [arch/77 P5b] game-store 헬퍼 정본 — game-store.ts에서 동작 보존 분리.
// 상태 매핑(HUD/장비/캐릭터/phase) + 내러티브 파이프라인(flush/poll/stream/
// request/processTurnResponse). GameState 타입은 type-only import (런타임 순환 없음).
import type {
  Choice,
  CharacterInfo,
  SubmitTurnResponse,
  BattleEnemy,
  InventoryChanges,
  WorldStateUI,
  ResolveOutcome,
  GameNotification,
  WorldDeltaSummaryUI,
  ArcStateUI,
  NarrativeMarkUI,
  MainArcClockUI,
  PlayerThreadSummaryUI,
  EquipmentBagItem,
  StoryMessage,
  InventoryItem,
  PlayerHud,
  ServerResultV1,
  IncidentSummaryUI,
  SignalFeedItemUI,
  PlayerGoalUI,
  LocationDynamicStateUI,
  NpcEmotionalUI,
  ShopDisplayUI,
} from '@/types/game';
import { useAuthStore } from '@/store/auth-store';
import { getRun, getTurnDetail, getPartyTurnDetail } from '@/lib/api-client';
import { adaptPresetsForScenario } from '@/data/presets';
import { ITEM_CATALOG } from '@/data/items';
import { STAT_COLORS } from '@/data/stat-descriptions';
import {
  mapResultToMessages,
  mapTurnHistoryToMessages,
  stripNarratorChoices,
  type TurnHistoryItem,
} from '@/lib/result-mapper';
import {
  applyDiffToHud,
  applyEnemyDiffs,
  applyInventoryDiff,
} from '@/lib/hud-mapper';
import { ApiError } from '@/lib/api-errors';
import { type StreamOutput } from '@/lib/stream-parser';
import { connectLlmStream } from '@/lib/llm-stream';
import { uiLog } from '@/lib/ui-logger';
import type { GameState } from './game-store';

const USE_STREAMING = process.env.NEXT_PUBLIC_LLM_STREAMING === 'true';

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'var(--text-muted)',
  RARE: 'var(--info-blue)',
  UNIQUE: '#a855f7',
  LEGENDARY: 'var(--gold)',
};

/** 서버 runState에서 수신하는 구조 (인라인 타입 대체) */
export type RunStateSnapshot = {
  hp: number; maxHp: number; stamina: number; maxStamina: number; gold: number;
  inventory?: Array<{ itemId: string; qty: number }>;
  equipped?: Record<string, { instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>;
  equipmentBag?: Array<{ instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>;
};

const SLOT_ICONS: Record<string, string> = {
  WEAPON: 'sword',
  ARMOR: 'shirt',
  TACTICAL: 'hard-hat',
  POLITICAL: 'gem',
  RELIC: 'gem',
};

export function mapEquippedToDisplay(
  equipped?: Record<string, { instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>,
): import('@/types/game').EquipmentItem[] {
  if (!equipped) return [];
  const items: import('@/types/game').EquipmentItem[] = [];
  for (const [slot, instance] of Object.entries(equipped)) {
    if (!instance) continue;
    const meta = ITEM_CATALOG[instance.baseItemId];
    const rarity = meta?.rarity ?? undefined;
    items.push({
      slot,
      name: instance.displayName,
      baseName: meta?.name ?? instance.baseItemId,
      rarity,
      icon: meta?.icon ?? SLOT_ICONS[slot] ?? 'gem',
      color: rarity ? (RARITY_COLORS[rarity] ?? 'var(--text-primary)') : 'var(--text-primary)',
      prefixName: instance.prefixAffixId ? undefined : undefined, // affix 이름은 서버에서 displayName에 포함
      suffixName: instance.suffixAffixId ? undefined : undefined,
      statBonus: meta?.statBonus,
      baseItemId: instance.baseItemId,
      setId: meta?.setId,
    });
  }
  return items;
}

export function mapEquipmentBag(
  bag?: Array<{ instanceId: string; baseItemId: string; prefixAffixId?: string; suffixAffixId?: string; displayName: string }>,
): EquipmentBagItem[] {
  if (!bag || bag.length === 0) return [];
  return bag.map((instance) => {
    const meta = ITEM_CATALOG[instance.baseItemId];
    const rarity = meta?.rarity ?? undefined;
    const slot = meta?.slot ?? 'WEAPON';
    return {
      instanceId: instance.instanceId,
      baseItemId: instance.baseItemId,
      prefixAffixId: instance.prefixAffixId,
      suffixAffixId: instance.suffixAffixId,
      displayName: instance.displayName,
      slot,
      rarity,
      icon: meta?.icon ?? SLOT_ICONS[slot] ?? 'gem',
      color: rarity ? (RARITY_COLORS[rarity] ?? 'var(--text-primary)') : 'var(--text-primary)',
      setId: meta?.setId,
      statBonus: meta?.statBonus,
    };
  });
}

const GENERIC_STATS: Record<string, number> = {
  STR: 12, DEX: 10, WIT: 8, CON: 10, PER: 7, CHA: 8,
};

export function buildCharacterInfo(
  presetId: string | undefined,
  gender: 'male' | 'female' = 'male',
  options?: { characterName?: string; portraitUrl?: string; bonusStats?: Record<string, number> },
  // architecture/63 ⑥: 시나리오별 프리셋 표기 (subtitle 등)
  scenarioId?: string | null,
  // architecture/71: 이월 캐릭터는 프리셋 파생 불가 — 서버 확정 스탯을 직접 표시
  statsOverride?: Record<string, number> | null,
): CharacterInfo {
  const preset = adaptPresetsForScenario(scenarioId ?? null).find(
    (p) => p.presetId === presetId,
  );
  const bonus = options?.bonusStats ?? {};
  const statValue = (key: string): number => {
    const k = key.toLowerCase();
    if (statsOverride) return statsOverride[k] ?? statsOverride[key] ?? 0;
    if (preset)
      return (
        (preset.stats[k] ?? preset.stats[key] ?? 0) + (bonus[k] ?? 0)
      );
    return GENERIC_STATS[key] ?? 0;
  };
  return {
    name: options?.characterName || preset?.name || '용병',
    class: preset?.subtitle || '방랑 검사',
    portrait: options?.portraitUrl || preset?.portraits?.[gender],
    level: 1,
    exp: 0,
    maxExp: 100,
    stats: (['STR', 'DEX', 'WIT', 'CON', 'PER', 'CHA'] as const).map((key) => ({
      label: key,
      value: statValue(key),
      color: STAT_COLORS[key] ?? 'var(--text-primary)',
    })),
    equipment: [],
  };
}

/**
 * 노드 타입에서 UI phase 도출
 */
export function derivePhase(
  nodeType: string | null,
): GameState['phase'] {
  if (!nodeType) return 'HUB';
  switch (nodeType) {
    case 'HUB':
      return 'HUB';
    case 'LOCATION':
      return 'LOCATION';
    case 'COMBAT':
      return 'COMBAT';
    default:
      // 기존 노드 타입 (EVENT, REST, SHOP, EXIT) → LOCATION 취급
      return 'LOCATION';
  }
}

const LLM_POLL_INTERVAL_MS = 2000;
const LLM_POLL_MAX_ATTEMPTS = 45; // 최대 90초 (Gemma4 + nano 후처리)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 서버에서 내려오는 영어/개발자 메시지를 사용자용 한국어 문구로 매핑.
 * 매칭은 원문에 포함된 키워드 기반(부분 문자열). 매칭 없으면 원문을 그대로 반환.
 */
const ERROR_MESSAGE_I18N: Array<{ match: RegExp; text: string }> = [
  {
    match: /Cannot use items during combat/i,
    text: '전투 중에는 소모품을 사용할 수 없습니다. 전투 턴의 USE_ITEM 액션으로 사용하세요.',
  },
  {
    match: /Item not found in inventory/i,
    text: '해당 아이템이 소지품에 없습니다.',
  },
  {
    match: /quantity is 0/i,
    text: '아이템 수량이 부족합니다.',
  },
  {
    match: /Item is not a consumable/i,
    text: '이 아이템은 사용할 수 없는 종류입니다.',
  },
  {
    match: /cannot be used outside of combat/i,
    text: '이 아이템은 전투 중에만 사용할 수 있습니다.',
  },
  {
    match: /Cannot equip this item/i,
    text: '이 아이템은 장착할 수 없습니다.',
  },
  {
    match: /Item not found in equipment bag/i,
    text: '장비 가방에서 해당 아이템을 찾을 수 없습니다.',
  },
  {
    match: /No equipment in slot/i,
    text: '이 슬롯에는 해제할 장비가 없습니다.',
  },
  {
    match: /Run is not active/i,
    text: '활성 상태의 플레이가 아닙니다.',
  },
  {
    match: /Not your run/i,
    text: '다른 플레이어의 플레이입니다.',
  },
];

export function translateApiMessage(raw: string): string {
  for (const entry of ERROR_MESSAGE_I18N) {
    if (entry.match.test(raw)) return entry.text;
  }
  return raw;
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return translateApiMessage(err.message);
  if (err instanceof Error) return translateApiMessage(err.message);
  return String(err);
}

/**
 * 내레이터 텍스트 확정 — pending은 flush하지 않음 (타이핑 애니메이션 완료 후 flushPending으로 처리)
 */
export function flushNarrator(
  text: string,
  turnNo: number,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
  /** true면 타이핑 애니메이션 스킵 (스트리밍 후 교체 시) */
  skipTyping = false,
) {
  const targetId = `narrator-${turnNo}`;
  const found = get().messages.some(m => m.id === targetId);
  uiLog('narrator', 'flushNarrator', { targetId, textLen: text.length, skipTyping, found });
  const messages = get().messages.map((msg) =>
    msg.id === targetId ? { ...msg, text, loading: false, ...(skipTyping ? { typed: true } : {}) } : msg,
  );
  set({ messages });
}

/**
 * LLM 내러티브 폴링 — NARRATOR 메시지를 LLM 생성 텍스트로 교체
 */
export function pollForNarrative(
  runId: string,
  turnNo: number,
  fallbackText: string,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
) {
  let attempts = 0;

  const timer = setInterval(async () => {
    attempts++;

    try {
      const detail = await getTurnDetail(runId, turnNo);

      if (detail.llm.status === 'DONE' && detail.llm.output) {
        clearInterval(timer);
        if (detail.llm.tokenStats) {
          set({ llmStats: { ...detail.llm.tokenStats, model: detail.llm.modelUsed } });
        }
        // LLM 맥락 선택지로 교체
        if (detail.llm.choices && detail.llm.choices.length > 0) {
          set({ pendingChoices: detail.llm.choices.map(c => ({ id: c.id, label: c.label, affordance: c.action?.payload?.affordance as string | undefined })) });
        }
        flushNarrator(stripNarratorChoices(detail.llm.output!), turnNo, get, set);
        return;
      }

      if (detail.llm.status === 'SKIPPED') {
        clearInterval(timer);
        // SKIPPED: 하드코딩 프롤로그 등 — fallbackText(display)로 즉시 표시
        flushNarrator(fallbackText, turnNo, get, set);
        return;
      }

      if (detail.llm.status === 'FAILED') {
        clearInterval(timer);
        const errInfo = detail.llm.error;
        const provider = (errInfo as Record<string, unknown> | null)?.provider as string | undefined;
        const errorMsg = (errInfo as Record<string, unknown> | null)?.error as string | undefined;
        set({
          llmFailure: {
            message: errorMsg ?? 'AI 서술 생성에 실패했습니다.',
            provider,
            turnNo,
          },
          isNarrating: false,
        });
        // 게임 정지: narrator를 로딩 상태로 유지, pending flush하지 않음
        return;
      }

      if (attempts >= LLM_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        set({
          llmFailure: {
            message: 'AI 서술 응답 시간이 초과되었습니다.',
            turnNo,
          },
          isNarrating: false,
        });
        return;
      }
    } catch {
      // 네트워크 오류 시 계속 시도, 최대 횟수 초과 시 에러 표시
      if (attempts >= LLM_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        set({
          llmFailure: {
            message: '서버와의 연결에 실패했습니다.',
            turnNo,
          },
          isNarrating: false,
        });
      }
    }
  }, LLM_POLL_INTERVAL_MS);
}

/**
 * LLM 서술을 SSE 스트리밍으로 수신하여 실시간 렌더링.
 * 실패 시 자동으로 pollForNarrative fallback.
 */
export function streamNarrative(
  runId: string,
  turnNo: number,
  fallbackText: string,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
) {
  const token = useAuthStore.getState().token;
  if (!token) {
    // 토큰 없으면 폴링 fallback
    pollForNarrative(runId, turnNo, fallbackText, get, set);
    return;
  }

  let receivedDone = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let rawBuffer = '';           // 토큰 누적 원본 버퍼
  let analyzedBuffer = '';      // 분석 완료 텍스트 (버퍼에 누적)
  // P0-2: done 미수신 안전망 — Track 2 nano 가 hang/네트워크 단절 시 폴링 fallback 으로 강제 전환
  //   값은 LLM_TIMEOUT_MS(8s) + Track 2 nano 평균 3s + buffer 를 고려해 45s 로 보수적 설정
  const STREAM_DONE_TIMEOUT_MS = 45_000;
  let doneWatchdog: ReturnType<typeof setTimeout> | null = null;

  // speakingNpc 정보 (대사 귀속용)
  const narratorMsg = get().messages.find(m => m.id === `narrator-${turnNo}`);
  const speakingNpc = (narratorMsg as Record<string, unknown> | undefined)?.speakingNpc as
    { npcId?: string; displayName?: string; imageUrl?: string } | undefined;

  // NPC 초상화 맵 빌드
  const npcPortraitMap = new Map<string, string>();
  if (speakingNpc?.displayName && speakingNpc?.imageUrl) {
    npcPortraitMap.set(speakingNpc.displayName, speakingNpc.imageUrl);
  }

  set({
    isStreaming: true,
    streamSegments: [],
    streamTextBuffer: '',
    streamBufferDone: false,
  });

  uiLog('stream', 'streamNarrative 시작', { runId, turnNo });

  // P0-2: done 안전망 — 시간 초과 시 폴링 fallback
  doneWatchdog = setTimeout(() => {
    if (receivedDone) return;
    uiLog('stream', 'doneWatchdog timeout → 폴링 fallback', { runId, turnNo, timeoutMs: STREAM_DONE_TIMEOUT_MS });
    if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
    const disc = get().streamDisconnect;
    if (disc) try { disc(); } catch { /* ignore */ }
    set({
      isStreaming: false,
      streamSegments: [],
      streamDisconnect: null,
      choicesLoading: false,
    });
    pollForNarrative(runId, turnNo, fallbackText, get, set);
  }, STREAM_DONE_TIMEOUT_MS);

  /**
   * 원본 버퍼에서 완성된 문장까지 추출 (나머지는 버퍼에 유지).
   */
  function extractCompleteSentences(): string | null {
    let lastEnd = -1;
    for (let i = rawBuffer.length - 1; i >= 0; i--) {
      const ch = rawBuffer[i];
      if (ch === '\n') { lastEnd = i + 1; break; }
      if ('.!?'.includes(ch) && i < rawBuffer.length - 1) {
        const next = rawBuffer[i + 1];
        if (next === ' ' || next === '\n') { lastEnd = i + 1; break; }
      }
    }
    if (lastEnd <= 0) return null;
    const extracted = rawBuffer.slice(0, lastEnd);
    rawBuffer = rawBuffer.slice(lastEnd);
    return extracted;
  }

  /**
   * 대사/문단 분석: "NPC별칭: "대사"" → @마커 변환, 문단 재조합.
   *
   * LLM이 문장마다 개행을 넣어 스트림에 flush돼도, narration 라인은 공백으로
   * 병합해 하나의 문단으로 만든다. 대사(@[...] "...")는 독립 줄로 유지.
   * 문단 경계는 원본 빈 줄(`\n\n`)에서만 발생.
   */
  function analyzeText(text: string): string {
    const dialogueRe = /^([^":]{2,}):\s*"([^"]+)"?\s*$/;
    const transformed = text.split('\n').map((line) => {
      const m = line.match(dialogueRe);
      if (m) {
        const npcName = m[1].trim();
        const portrait = npcPortraitMap.get(npcName);
        const markerName = portrait ? `${npcName}|${portrait}` : npcName;
        return `@[${markerName}] "${m[2]}"`;
      }
      return line;
    });

    const paragraphs: string[] = [];
    let paraLines: string[] = [];
    const flushParagraph = () => {
      if (paraLines.length === 0) return;
      const parts: string[] = [];
      let narrationBuf: string[] = [];
      const flushNarr = () => {
        if (narrationBuf.length === 0) return;
        const merged = narrationBuf.join(' ').replace(/\s+/g, ' ').trim();
        if (merged) parts.push(merged);
        narrationBuf = [];
      };
      for (const line of paraLines) {
        const t = line.trim();
        if (!t) continue;
        if (/^@\[[^\]]+\]/.test(t)) {
          // 대사 마커 라인은 독립 유지
          flushNarr();
          parts.push(t);
        } else {
          narrationBuf.push(t);
        }
      }
      flushNarr();
      const joined = parts.join('\n').trim();
      if (joined) paragraphs.push(joined);
      paraLines = [];
    };
    for (const line of transformed) {
      if (line.trim() === '') {
        flushParagraph();
      } else {
        paraLines.push(line);
      }
    }
    flushParagraph();

    return paragraphs.join('\n\n');
  }

  /**
   * extract 경계에서 잘린 두 analyzed 조각을 자연스럽게 이어 붙인다.
   * 이전 버퍼가 개행으로 끝나면(문단/대사 경계) 그대로, 아니면 공백으로 연결.
   * 이렇게 해야 LLM이 문장마다 flush되더라도 문장 줄바꿈이 추가되지 않는다.
   */
  function appendAnalyzed(current: string, next: string): string {
    if (!current) return next;
    if (!next) return current;
    if (current.endsWith('\n') || next.startsWith('\n')) return current + next;
    return current + ' ' + next;
  }

  // 300ms 간격으로 완성된 문장을 분석 → streamTextBuffer에 누적
  // 컴포넌트(StreamTyper)가 버퍼에서 한 글자씩 읽어 타이핑 렌더링
  flushTimer = setInterval(() => {
    const extracted = extractCompleteSentences();
    if (!extracted) return;
    const analyzed = analyzeText(extracted);
    analyzedBuffer = appendAnalyzed(analyzedBuffer, analyzed);
    uiLog('stream', 'buffer flush', { bufLen: analyzedBuffer.length, extractedLen: extracted.length });
    set({ streamTextBuffer: analyzedBuffer });
  }, 300);

  const disconnect = connectLlmStream(runId, turnNo, token, {
    onToken(text) {
      // 레거시 경로 (LLM_STREAM_CLASSIFIER=false 시)
      rawBuffer += text;
    },

    // Queue-based Renderer (bug 4725, architecture/39 Phase B):
    //   서버가 분류한 세그먼트를 streamSegments 에 push.
    //   StreamingBlock 컴포넌트가 segments 를 받아 자체 타이핑 애니메이션 렌더.
    //   서버 스트리밍(~95자/s) vs 타이핑(~40자/s) 차이로 segments 가 자연스럽게
    //   앞서 쌓이고, 말풍선은 프레임부터 표시되며 내부에서만 타이핑.
    //   기존 analyzedBuffer 도 fallback/diagnostic 용도로 유지.
    onNarration(text, paragraphStart) {
      const seg: StreamOutput = { type: 'narration', text, paragraphStart };
      set({ streamSegments: [...get().streamSegments, seg] });
      // fallback
      analyzedBuffer = appendAnalyzed(analyzedBuffer, text);
      set({ streamTextBuffer: analyzedBuffer });
    },
    onDialogue(text, npcName, npcImage, paragraphStart) {
      const seg: StreamOutput = {
        type: 'dialogue',
        text,
        npcName,
        npcImage,
        paragraphStart,
      };
      set({ streamSegments: [...get().streamSegments, seg] });
      // fallback
      const marker = npcName
        ? npcImage
          ? `@[${npcName}|${npcImage}]`
          : `@[${npcName}]`
        : '';
      const line = marker ? `${marker} "${text}"` : `"${text}"`;
      analyzedBuffer = appendAnalyzed(analyzedBuffer, line);
      set({ streamTextBuffer: analyzedBuffer });
    },

    onChoicesLoading() {
      set({ choicesLoading: true });
    },

    onDone(narrative, choices) {
      uiLog('stream', 'onDone', { narrativeLen: narrative?.length, choicesCount: choices?.length, analyzedBufLen: analyzedBuffer.length, rawBufLen: rawBuffer.length });
      receivedDone = true;

      // 타이머 정리
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      if (doneWatchdog) { clearTimeout(doneWatchdog); doneWatchdog = null; }

      // 남은 버퍼 전부 flush → streamTextBuffer에 추가
      const remaining = extractCompleteSentences();
      if (remaining) {
        analyzedBuffer = appendAnalyzed(analyzedBuffer, analyzeText(remaining));
      }
      if (rawBuffer.trim()) {
        analyzedBuffer = appendAnalyzed(analyzedBuffer, analyzeText(rawBuffer.trim()));
        rawBuffer = '';
      }

      // 선택지 pending
      if (choices && choices.length > 0) {
        set({
          pendingChoices: choices.map(c => ({
            id: c.id,
            label: c.label,
            affordance: c.action?.payload?.affordance as string | undefined,
          })),
        });
      }

      // Phase 2 최종 교체 (bug 4693):
      //   Phase 1 (스트리밍 중) 의 analyzedBuffer 가 classifier 튀는 조각 (예:
      //   "로넨:" 반복) 을 축적한 경우, 화면에 그대로 남는 문제 방지.
      //   onDone 시 최종 narrative 로 강제 교체 → 타이핑 완료 시점에 정리.
      const finalText = stripNarratorChoices(narrative);
      const finalAnalyzed = analyzeText(finalText);
      set({
        streamTextBuffer: finalAnalyzed || finalText,
        streamBufferDone: true,
        streamDisconnect: null,
        choicesLoading: false,
      });

      // done 이벤트에서 tokenStats 조회
      getTurnDetail(runId, turnNo).then((detail) => {
        if (detail.llm?.tokenStats) {
          set({ llmStats: { ...detail.llm.tokenStats, model: detail.llm.modelUsed } });
        }
      }).catch(() => { /* 무시 */ });
    },

    onError(_message) {
      // 타이머 정리
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      if (doneWatchdog) { clearTimeout(doneWatchdog); doneWatchdog = null; }

      // 스트리밍 실패 — 상태 정리 후 폴링 fallback
      rawBuffer = '';
      set({
        isStreaming: false,
        streamSegments: [],
        streamDisconnect: null,
        choicesLoading: false,
      });
      if (!receivedDone) {
        pollForNarrative(runId, turnNo, fallbackText, get, set);
      }
    },
  });

  set({ streamDisconnect: disconnect });
}

/**
 * 스트리밍 또는 폴링을 환경변수에 따라 분기 호출하는 헬퍼.
 */
export function requestNarrative(
  runId: string,
  turnNo: number,
  fallbackText: string,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
) {
  if (USE_STREAMING) {
    // 즉시 로딩 상태 표시 (턴 상태 조회 전에)
    set({ isStreaming: true, streamSegments: [] });

    // SKIPPED 턴(프롤로그 등 하드코딩)은 스트리밍 불필요 — 즉시 폴링으로 처리
    getTurnDetail(runId, turnNo).then((detail) => {
      const status = detail.llm?.status;
      if (status === 'SKIPPED' || status === 'DONE') {
        // 이미 완료 — 스트리밍 해제 후 폴링으로 즉시 처리
        set({ isStreaming: false, streamSegments: [] });
        pollForNarrative(runId, turnNo, fallbackText, get, set);
      } else {
        // PENDING/RUNNING — 스트리밍 시작 (isStreaming은 이미 true)
        streamNarrative(runId, turnNo, fallbackText, get, set);
      }
    }).catch(() => {
      // 조회 실패 — 스트리밍 시도
      streamNarrative(runId, turnNo, fallbackText, get, set);
    });
  } else {
    pollForNarrative(runId, turnNo, fallbackText, get, set);
  }
}

/**
 * Process a SubmitTurnResponse and apply its effects to the store.
 * Shared by both submitAction and submitChoice.
 */
export function processTurnResponse(
  turnRes: SubmitTurnResponse,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
) {
  const result = turnRes.serverResult;

  // Map result to displayable messages
  // 노드 전이가 있으면 action narrator는 건너뜀 (enter narrator가 대체)
  const isLlmSkipped = turnRes.llm?.status === 'SKIPPED';
  const allMessages = mapResultToMessages(result, 'narrator', isLlmSkipped);
  const hasTransition = turnRes.meta?.nodeOutcome === 'NODE_ENDED' || !!turnRes.transition;
  const newMessages = hasTransition
    ? allMessages.filter((m) => m.type !== 'NARRATOR')
    : allMessages;

  // Apply diff to HUD
  const updatedHud = result.diff
    ? applyDiffToHud(get().hud, result.diff)
    : get().hud;

  // Apply diff to inventory
  const updatedInventory = result.diff?.inventory
    ? applyInventoryDiff(get().inventory, result.diff.inventory)
    : get().inventory;

  // Apply diff to equipment bag
  const newEquipment = result.diff?.equipmentAdded;
  const newDropItems = newEquipment && newEquipment.length > 0 ? mapEquipmentBag(newEquipment) : [];
  const updatedEquipmentBag = newDropItems.length > 0
    ? [...get().equipmentBag, ...newDropItems]
    : get().equipmentBag;

  // Track inventory changes for UI feedback
  const invDiff = result.diff?.inventory;
  const hasInvChanges = invDiff && (
    (invDiff.itemsAdded?.length ?? 0) > 0 ||
    (invDiff.itemsRemoved?.length ?? 0) > 0 ||
    invDiff.goldDelta !== 0
  );
  const newInventoryChanges: InventoryChanges | null = hasInvChanges
    ? { itemsAdded: invDiff.itemsAdded ?? [], itemsRemoved: invDiff.itemsRemoved ?? [], goldDelta: invDiff.goldDelta }
    : null;

  // Extract choices from result
  const newChoices: Choice[] = (result.choices ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    affordance: c.action?.payload?.affordance as string | undefined,
  }));

  const hasLlmPending = turnRes.llm?.status === 'PENDING' && !hasTransition;

  if (hasLlmPending) {
    // 내레이터 + 판정 결과 먼저 표시, 나머지는 내레이션 완료 후 flush
    // CHOICE는 pendingChoices로 별도 관리 — pendingMessages에 포함하면 flushPending 시 충돌
    const immediateMsgs = newMessages.filter((m) => m.type === 'NARRATOR' || m.type === 'RESOLVE');
    const otherMsgs = newMessages.filter((m) => m.type !== 'NARRATOR' && m.type !== 'RESOLVE' && m.type !== 'CHOICE');

    set({
      messages: [...get().messages, ...immediateMsgs],
      pendingMessages: otherMsgs,
      hud: updatedHud,
      inventory: updatedInventory,
      equipmentBag: updatedEquipmentBag,
      recentEquipmentDrops: newDropItems.length > 0 ? newDropItems : get().recentEquipmentDrops,
      inventoryChanges: newInventoryChanges,
      choices: [],
      pendingChoices: newChoices,
      currentTurnNo: turnRes.turnNo + 1,
      isSubmitting: false,
      isNarrating: true,
    });

    const runId = get().runId;
    if (runId) {
      requestNarrative(runId, turnRes.turnNo, result.summary?.display ?? result.summary?.short ?? '', get, set);
    }
  } else {
    // LLM 없음 또는 노드 전이 — 모든 메시지 즉시 표시
    set({
      messages: [...get().messages, ...newMessages],
      pendingMessages: [],
      hud: updatedHud,
      inventory: updatedInventory,
      equipmentBag: updatedEquipmentBag,
      recentEquipmentDrops: newDropItems.length > 0 ? newDropItems : get().recentEquipmentDrops,
      inventoryChanges: newInventoryChanges,
      choices: hasTransition ? [] : newChoices,
      pendingChoices: [],
      currentTurnNo: turnRes.turnNo + 1,
      isSubmitting: false,
    });
  }

  applyServerResultUi(result, get, set);

  // Handle node / run outcome
  const outcome = turnRes.meta?.nodeOutcome;

  if (outcome === 'RUN_ENDED') {
    // EndingResult가 UIBundle에 포함되어 있으면 추출
    const endingData = (result.ui as Record<string, unknown>)?.endingResult as import('@/types/game').EndingResult | undefined;
    set({ phase: 'RUN_ENDED', endingResult: endingData ?? null });
    return;
  }

  if (outcome === 'NODE_ENDED' || turnRes.transition) {
    // 전환 화면 없이 즉시 다음 노드로 전환
    if (turnRes.transition) {
      const t = turnRes.transition;
      const enterMessages = mapResultToMessages(t.enterResult);
      const enterChoices: Choice[] = (
        t.enterResult.choices ?? []
      ).map((c) => ({ id: c.id, label: c.label, affordance: c.action?.payload?.affordance as string | undefined }));

      const narratorMsgs = enterMessages.filter((m) => m.type === 'NARRATOR');
      const systemMsgs = enterMessages.filter((m) => m.type === 'SYSTEM');
      // CHOICE는 pendingChoices(enterChoices)로 별도 관리 — pendingMessages에서 제외
      const otherMsgs = enterMessages.filter(
        (m) => m.type !== 'NARRATOR' && m.type !== 'SYSTEM' && m.type !== 'CHOICE',
      );

      const enterTurnNo = t.enterTurnNo ?? t.enterResult.turnNo;
      const nextPhase = derivePhase(t.nextNodeType);
      const transWs = t.enterResult.ui?.worldState as WorldStateUI | undefined;
      const locName = t.enterResult.summary?.display ?? null;

      set({
        phase: nextPhase,
        currentNodeType: t.nextNodeType,
        currentNodeIndex: t.nextNodeIndex,
        battleState: t.battleState ?? null,
        messages: [...get().messages, ...systemMsgs, ...narratorMsgs],
        pendingMessages: otherMsgs,
        choices: [],
        pendingChoices: enterChoices,
        currentTurnNo: enterTurnNo + 1,
        ...(transWs ? { worldState: transWs } : {}),
        locationName: locName,
        isNarrating: true,
      });

      const runId = get().runId;
      if (runId) {
        requestNarrative(
          runId,
          enterTurnNo,
          t.enterResult.summary?.display ?? t.enterResult.summary?.short ?? '',
          get,
          set,
        );
      }
    } else {
      // Fallback: re-fetch
      (async () => {
        try {
          const runId = get().runId;
          if (!runId) return;

          const runData = (await getRun(runId)) as Record<string, unknown>;
          const currentNode = runData.currentNode as
            | Record<string, unknown>
            | undefined;
          const nodeType = (currentNode?.nodeType as string) ?? null;

          set({
            phase: derivePhase(nodeType),
            currentNodeType: nodeType,
            currentNodeIndex: (currentNode?.nodeIndex as number) ?? 0,
            battleState: (runData.battleState as unknown) ?? null,
          });
        } catch (err) {
          set({
            phase: 'ERROR',
            error: extractErrorMessage(err),
          });
        }
      })();
    }
  } else {
    // 전이 없음 — 현재 노드 타입에 따라 phase 유지/전환
    const nodeType = result.node?.type;
    if (nodeType) {
      const newPhase = derivePhase(nodeType);
      if (get().phase !== newPhase) {
        set({ phase: newPhase });
      }
    }
  }

  // EQUIP/UNEQUIP 이벤트 감지 → 장비 상태 동기화 (비동기 re-fetch)
  const hasEquipEvent = result.events?.some(
    (e) => e.tags?.includes('EQUIP') || e.tags?.includes('UNEQUIP'),
  );
  if (hasEquipEvent) {
    const eqRunId = get().runId;
    if (eqRunId) {
      getRun(eqRunId).then((runData) => {
        const rd = runData as Record<string, unknown>;
        const rs = rd.runState as RunStateSnapshot | undefined;
        if (rs) {
          const currentCharInfo = get().characterInfo;
          if (currentCharInfo) {
            set({
              characterInfo: {
                ...currentCharInfo,
                equipment: mapEquippedToDisplay(rs.equipped),
              },
              equipmentBag: mapEquipmentBag(rs.equipmentBag),
            });
          }
        }
      }).catch(() => { /* silent — equipment sync is best-effort */ });
    }
  }
}

const SNAPSHOT_INITIAL_HUD: PlayerHud = {
  hp: 100,
  maxHp: 100,
  stamina: 5,
  maxStamina: 5,
  gold: 50,
};

/**
 * getRun/getPartyRunState 응답(동일 구조)을 게임 스토어 상태로 적용한다.
 * 솔로 resumeRun과 파티 멤버 resumePartyRun이 공유한다 (arch/84 C8).
 * - fallback: run.presetId/gender가 비었을 때의 프리셋·성별 (솔로는 activeRunInfo).
 * - extra: 추가로 병합할 상태(파티는 partyContext). 최종 set에 얹는다.
 */
export function applyRunSnapshot(
  data: Record<string, unknown>,
  fallback: { presetId: string; gender: 'male' | 'female' } | null,
  extra: Partial<GameState>,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
): void {
  const run = data.run as Record<string, unknown>;
  const runId = run.id as string;
  set({ scenarioId: (run.scenarioId as string | undefined) ?? null });
  const currentNode = data.currentNode as Record<string, unknown> | undefined;
  const lastResult = data.lastResult as ServerResultV1 | undefined;
  const battleState = data.battleState as unknown | undefined;
  const runState = data.runState as RunStateSnapshot | undefined;
  const turnsArr = data.turns as TurnHistoryItem[] | undefined;

  const hud: PlayerHud = runState
    ? {
        hp: runState.hp,
        maxHp: runState.maxHp,
        stamina: runState.stamina,
        maxStamina: runState.maxStamina,
        gold: runState.gold,
      }
    : { ...SNAPSHOT_INITIAL_HUD };

  const restoredInventory: InventoryItem[] = (runState?.inventory ?? []).map((i) => ({
    itemId: i.itemId,
    qty: i.qty,
  }));

  // ── 대화 이력 복원 ──
  let restoredMessages: StoryMessage[] = [];
  let restoredChoices: Choice[] = [];

  // 서버는 newest-first → 시간순으로 뒤집기
  const chronological = turnsArr && turnsArr.length > 0 ? [...turnsArr].reverse() : [];

  if (chronological.length > 1) {
    const pastTurns = chronological.slice(0, -1);
    restoredMessages = mapTurnHistoryToMessages(pastTurns);
  }

  if (lastResult) {
    const lastTurnMessages = mapResultToMessages(lastResult);
    const lastTurn = chronological.length > 0 ? chronological[chronological.length - 1] : undefined;

    if (lastTurn) {
      if (lastTurn.inputType === 'ACTION' && lastTurn.rawInput) {
        restoredMessages.push({
          id: `history-player-${lastTurn.turnNo}`,
          type: 'PLAYER',
          text: lastTurn.rawInput,
        });
      } else if (lastTurn.inputType === 'CHOICE' && lastTurn.rawInput) {
        const prevTurn = chronological.length > 1 ? chronological[chronological.length - 2] : undefined;
        const prevChoices = prevTurn?.choices ?? [];
        const label = prevChoices.find((c: { id: string; label: string }) => c.id === lastTurn.rawInput)?.label ?? lastTurn.rawInput;
        restoredMessages.push({
          id: `history-player-${lastTurn.turnNo}`,
          type: 'PLAYER',
          text: label,
        });
      }
    }

    const finalLastMessages = lastTurn?.llmOutput && lastTurn.llmStatus === 'DONE'
      ? lastTurnMessages.map((msg) =>
          msg.type === 'NARRATOR' ? { ...msg, text: stripNarratorChoices(lastTurn.llmOutput!), loading: false } : msg,
        )
      : lastTurnMessages.map((msg) =>
          msg.type === 'NARRATOR'
            ? {
                ...msg,
                text:
                  msg.text ||
                  stripNarratorChoices(
                    lastResult.summary?.display || lastResult.summary?.short || '',
                  ),
                loading: false,
              }
            : msg,
        );

    restoredMessages = [...restoredMessages, ...finalLastMessages];
    restoredChoices = (lastResult.choices ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      affordance: c.action?.payload?.affordance as string | undefined,
      hint: c.hint,
    }));
  }

  const nodeType = (currentNode?.nodeType as string) ?? null;
  const resumePhase = derivePhase(nodeType);
  const resumeWs = lastResult?.ui?.worldState as WorldStateUI | undefined;

  const rsAny = runState as Record<string, unknown> | undefined;
  const wsObj = (rsAny?.worldState ?? {}) as Record<string, unknown>;

  set({
    phase: resumePhase,
    runId,
    currentNodeType: nodeType,
    currentNodeIndex: (currentNode?.nodeIndex as number) ?? 0,
    currentTurnNo: (run.currentTurnNo as number) + 1,
    hud,
    inventory: restoredInventory,
    battleState: battleState ?? null,
    messages: restoredMessages,
    pendingMessages: [],
    choices: restoredChoices,
    pendingChoices: [],
    isSubmitting: false,
    activeRunInfo: null,
    characterInfo: {
      ...buildCharacterInfo(
        (run.presetId as string) ?? fallback?.presetId ?? 'dockworker',
        ((run.gender as string) ?? fallback?.gender ?? 'male') as 'male' | 'female',
        {
          characterName: (runState as Record<string, unknown>)?.characterName as string | undefined,
          portraitUrl: (runState as Record<string, unknown>)?.portraitUrl as string | undefined,
        },
        (run.scenarioId as string | undefined) ?? null,
        (data.stats as Record<string, number> | null | undefined) ?? undefined,
      ),
      equipment: mapEquippedToDisplay(runState?.equipped),
    },
    equipmentBag: mapEquipmentBag(runState?.equipmentBag),
    setDefinitions: (data.setDefinitions as GameState['setDefinitions']) ?? [],
    worldState: resumeWs ?? null,
    resolveOutcome: null,
    locationName: null,
    arcState: (rsAny?.arcState as ArcStateUI) ?? null,
    narrativeMarks: (wsObj?.narrativeMarks as NarrativeMarkUI[]) ?? [],
    mainArcClock: (wsObj?.mainArcClock as MainArcClockUI) ?? null,
    playerThreads: (wsObj?.playerThreads as PlayerThreadSummaryUI[]) ?? [],
    day: (wsObj?.day as number) ?? 1,
    playerGoals: (wsObj?.playerGoals as PlayerGoalUI[]) ?? (resumeWs?.playerGoals ?? []),
    locationDynamicStates: (wsObj?.locationDynamicStates as Record<string, LocationDynamicStateUI>) ?? (resumeWs?.locationDynamicStates ?? {}),
    npcEmotional: (data.npcEmotional as NpcEmotionalUI[] | undefined) ?? [],
    shops: ((lastResult?.ui as Record<string, unknown> | undefined)?.shops as ShopDisplayUI[] | undefined) ?? [],
    ...extra,
  });
  get().fetchSceneImageStatus();
}

/**
 * serverResult의 UI 번들(worldState / 시그널 / 사건 / 알림 / 아크 / 상점 /
 * 적 diff / resolveOutcome)을 스토어에 반영한다. 솔로 processTurnResponse와
 * 파티 applyPartyTurnResult가 공유 (arch/84 C8). 순수 side-effect(set)만 수행.
 */
export function applyServerResultUi(
  result: ServerResultV1,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
): void {
  // diff.enemies로 battleState.enemies HP/status/distance/angle 갱신
  const currentBattle = get().battleState as { enemies: BattleEnemy[] } | null;
  if (currentBattle?.enemies && result.diff?.enemies?.length > 0) {
    const updatedEnemies = applyEnemyDiffs(currentBattle.enemies, result.diff.enemies as Parameters<typeof applyEnemyDiffs>[1]);
    set({ battleState: { ...currentBattle, enemies: updatedEnemies } });
  }

  // WorldState 업데이트
  const wsUI = result.ui?.worldState as WorldStateUI | undefined;
  if (wsUI) {
    set({ worldState: wsUI });
    if (wsUI.playerGoals) set({ playerGoals: wsUI.playerGoals });
    if (wsUI.locationDynamicStates) set({ locationDynamicStates: wsUI.locationDynamicStates });
  }

  // Narrative Engine v1 UI 업데이트
  const uiBundle = result.ui as Record<string, unknown> | undefined;
  if (uiBundle) {
    const sf = uiBundle.signalFeed as SignalFeedItemUI[] | undefined;
    const ai = uiBundle.activeIncidents as IncidentSummaryUI[] | undefined;
    const op = uiBundle.operationProgress as import('@/types/game').OperationProgressUI | undefined;
    const ne = uiBundle.npcEmotional as NpcEmotionalUI[] | undefined;
    if (sf) {
      const prevIds = new Set(get().signalFeed.map(s => s.id));
      const newImportant = sf.filter(s => !prevIds.has(s.id) && s.severity >= 3);
      set({ signalFeed: sf });
      if (newImportant.length > 0) {
        const headlines = uiBundle.newsHeadlines as string[] | undefined;
        if (headlines && headlines.length > 0) {
          const allImportant = sf.filter(s => s.severity >= 3);
          const newsItems = allImportant.map((s, i) => ({
            ...s,
            text: headlines[i] ?? s.text,
          }));
          const newsNew = newsItems.filter(s => !prevIds.has(s.id));
          set({ pendingNewsSignals: newsNew.length > 0 ? newsNew : newImportant });
        } else {
          set({ pendingNewsSignals: newImportant });
        }
      }
    }
    if (ai) set({ activeIncidents: ai });
    if (op !== undefined) set({ operationProgress: op ?? null });
    if (ne) set({ npcEmotional: ne });
    set({ shops: (uiBundle.shops as ShopDisplayUI[] | undefined) ?? [] });

    const notifs = uiBundle.notifications as GameNotification[] | undefined;
    const pinned = uiBundle.pinnedAlerts as GameNotification[] | undefined;
    const wds = uiBundle.worldDeltaSummary as WorldDeltaSummaryUI | undefined;
    if (notifs) set({ notifications: notifs });
    if (pinned) set({ pinnedAlerts: pinned });
    if (wds !== undefined) set({ worldDeltaSummary: wds ?? null });

    const arc = uiBundle.arcState as ArcStateUI | undefined;
    const marks = uiBundle.narrativeMarks as NarrativeMarkUI[] | undefined;
    const clock = uiBundle.mainArcClock as MainArcClockUI | undefined;
    const dayVal = uiBundle.day as number | undefined;
    const threads = uiBundle.playerThreads as PlayerThreadSummaryUI[] | undefined;
    if (arc) set({ arcState: arc });
    if (marks) set({ narrativeMarks: marks });
    if (clock) set({ mainArcClock: clock });
    if (dayVal !== undefined) set({ day: dayVal });
    if (threads) set({ playerThreads: threads });
  }

  // ResolveOutcome 업데이트
  const resolveOutcome = result.ui?.resolveOutcome as ResolveOutcome | undefined;
  set({ resolveOutcome: resolveOutcome ?? null });
}

/**
 * 파티 던전 통합 판정 결과(dungeon:turn_resolved SSE)를 스토어에 반영 (arch/84 C8).
 * serverResult는 즉시(HUD/UI/서사 뼈대) 반영하고, LLM 서사·선택지는
 * getPartyTurnDetail 폴링으로 채운다(멤버는 솔로 getTurnDetail 접근 불가).
 */
export function applyPartyTurnResult(
  partyId: string,
  runId: string,
  payload: { turnNo: number; serverResult: unknown; llmStatus?: string },
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
): void {
  const result = payload.serverResult as ServerResultV1 | undefined;
  if (!result) {
    set({ isSubmitting: false });
    return;
  }
  // NARRATOR 메시지 id·턴 상세 조회는 serverResult.turnNo 기준(정본).
  const turnNo = result.turnNo ?? payload.turnNo;

  // 서사/판정/시스템 메시지 구성 (내레이터 로딩 상태)
  const allMessages = mapResultToMessages(result, 'narrator', false);

  // HUD / 인벤토리 diff 반영
  const updatedHud = result.diff ? applyDiffToHud(get().hud, result.diff) : get().hud;
  const updatedInventory = result.diff?.inventory
    ? applyInventoryDiff(get().inventory, result.diff.inventory)
    : get().inventory;

  // 임시 선택지(serverResult) — LLM 선택지 도착 전까지의 placeholder
  const srChoices: Choice[] = (result.choices ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    affordance: c.action?.payload?.affordance as string | undefined,
  }));

  // UI 번들 반영 (worldState / 시그널 / 알림 / 아크 / 상점 등)
  applyServerResultUi(result, get, set);

  // 런 종료 (nodeOutcome은 런타임 serverResult에만 존재 — TS 타입엔 없음)
  const runEnded =
    (payload.serverResult as Record<string, unknown>)?.nodeOutcome === 'RUN_ENDED';
  if (runEnded) {
    const endingData = (result.ui as Record<string, unknown> | undefined)?.endingResult as import('@/types/game').EndingResult | undefined;
    set({
      messages: [...get().messages, ...allMessages.filter((m) => m.type !== 'NARRATOR')],
      hud: updatedHud,
      inventory: updatedInventory,
      choices: [],
      pendingChoices: [],
      isSubmitting: false,
      isNarrating: false,
      phase: 'RUN_ENDED',
      endingResult: endingData ?? null,
    });
    return;
  }

  // 내레이터 + 판정 즉시 표시, 나머지는 내레이션 완료 후 flush
  const immediateMsgs = allMessages.filter((m) => m.type === 'NARRATOR' || m.type === 'RESOLVE');
  const otherMsgs = allMessages.filter((m) => m.type !== 'NARRATOR' && m.type !== 'RESOLVE' && m.type !== 'CHOICE');
  const hasNarrator = immediateMsgs.some((m) => m.type === 'NARRATOR');

  set({
    messages: [...get().messages, ...immediateMsgs],
    pendingMessages: otherMsgs,
    hud: updatedHud,
    inventory: updatedInventory,
    inventoryChanges: null,
    choices: [],
    pendingChoices: srChoices,
    currentTurnNo: turnNo + 1,
    isSubmitting: false,
    isNarrating: hasNarrator,
  });

  if (hasNarrator) {
    pollPartyNarrative(
      partyId,
      runId,
      turnNo,
      result.summary?.display ?? result.summary?.short ?? '',
      get,
      set,
    );
  } else {
    // 서사 없음 — 즉시 flush
    get().flushPending();
  }
}

/**
 * 파티 턴 LLM 서술 폴링 — getPartyTurnDetail로 서사/선택지를 채운다 (arch/84 C8).
 * pollForNarrative의 파티 버전(멤버는 솔로 getTurnDetail 접근 불가).
 */
export function pollPartyNarrative(
  partyId: string,
  runId: string,
  turnNo: number,
  fallbackText: string,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
): void {
  let attempts = 0;

  const timer = setInterval(async () => {
    attempts++;
    try {
      const detail = await getPartyTurnDetail(partyId, runId, turnNo);
      const status = detail.llm?.status;

      if (status === 'DONE' && detail.llm.output) {
        clearInterval(timer);
        if (detail.llm.choices && detail.llm.choices.length > 0) {
          set({
            pendingChoices: detail.llm.choices.map((c) => ({
              id: c.id,
              label: c.label,
              affordance: c.action?.payload?.affordance as string | undefined,
            })),
          });
        }
        flushNarrator(stripNarratorChoices(detail.llm.output!), turnNo, get, set);
        return;
      }

      if (status === 'SKIPPED') {
        clearInterval(timer);
        flushNarrator(fallbackText, turnNo, get, set);
        return;
      }

      if (status === 'FAILED') {
        clearInterval(timer);
        // 파티 턴 서술 실패 — fallback 텍스트로 표시하고 진행 (게임 정지 방지)
        flushNarrator(fallbackText, turnNo, get, set);
        return;
      }

      if (attempts >= LLM_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        flushNarrator(fallbackText, turnNo, get, set);
      }
    } catch {
      if (attempts >= LLM_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        flushNarrator(fallbackText, turnNo, get, set);
      }
    }
  }, LLM_POLL_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
