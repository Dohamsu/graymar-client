import { create } from 'zustand';
import type {
  PlayerHud,
  StoryMessage,
  Choice,
  CharacterInfo,
  ServerResultV1,
  SubmitTurnResponse,
  BattleEnemy,
  InventoryItem,
  WorldStateUI,
  ResolveOutcome,
} from '@/types/game';
import { createRun, getActiveRun, getRun, submitTurn, getTurnDetail } from '@/lib/api-client';
import { PRESETS } from '@/data/presets';
import { mapResultToMessages } from '@/lib/result-mapper';
import { applyDiffToHud, applyEnemyDiffs, applyInventoryDiff } from '@/lib/hud-mapper';
import { ApiError } from '@/lib/api-errors';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface GameState {
  phase:
    | 'TITLE'
    | 'LOADING'
    | 'HUB'
    | 'LOCATION'
    | 'COMBAT'
    | 'NODE_TRANSITION'
    | 'RUN_ENDED'
    | 'ERROR';
  runId: string | null;
  currentNodeType: string | null;
  currentNodeIndex: number;
  currentTurnNo: number;
  hud: PlayerHud;
  inventory: InventoryItem[];
  battleState: unknown | null;
  messages: StoryMessage[];
  pendingMessages: StoryMessage[];
  choices: Choice[];
  pendingChoices: Choice[];
  isSubmitting: boolean;
  error: string | null;
  activeRunInfo: { runId: string; presetId: string; gender: 'male' | 'female'; currentTurnNo: number } | null;
  characterInfo: CharacterInfo | null;
  // HUB 전용 상태
  worldState: WorldStateUI | null;
  resolveOutcome: ResolveOutcome | null;
  locationName: string | null;

  // actions
  checkActiveRun: () => Promise<void>;
  resumeRun: () => Promise<void>;
  startNewGame: (presetId: string, gender?: 'male' | 'female') => Promise<void>;
  submitAction: (text: string) => Promise<void>;
  submitChoice: (choiceId: string) => Promise<void>;
  flushPending: () => void;
  clearError: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_HUD: PlayerHud = {
  hp: 100,
  maxHp: 100,
  stamina: 5,
  maxStamina: 5,
  gold: 50,
};

const STAT_COLORS: Record<string, string> = {
  ATK: 'var(--hp-red)',
  DEF: 'var(--info-blue)',
  ACC: 'var(--success-green)',
  EVA: 'var(--gold)',
  CRIT: 'var(--hp-red)',
  SPEED: 'var(--success-green)',
  RESIST: 'var(--info-blue)',
};

function buildCharacterInfo(presetId: string, gender: 'male' | 'female' = 'male'): CharacterInfo {
  const preset = PRESETS.find((p) => p.presetId === presetId);
  if (!preset) {
    return {
      name: '용병',
      class: '방랑 검사',
      level: 1,
      exp: 0,
      maxExp: 100,
      stats: [
        { label: 'ATK', value: 15, color: 'var(--hp-red)' },
        { label: 'DEF', value: 10, color: 'var(--info-blue)' },
        { label: 'ACC', value: 5, color: 'var(--success-green)' },
        { label: 'EVA', value: 3, color: 'var(--gold)' },
      ],
      equipment: [],
    };
  }

  return {
    name: preset.name,
    class: preset.subtitle,
    portrait: preset.portraits?.[gender],
    level: 1,
    exp: 0,
    maxExp: 100,
    stats: (
      ['ATK', 'DEF', 'ACC', 'EVA', 'CRIT', 'SPEED', 'RESIST'] as const
    ).map((key) => ({
      label: key,
      value: preset.stats[key],
      color: STAT_COLORS[key] ?? 'var(--text-primary)',
    })),
    equipment: [],
  };
}

/**
 * 노드 타입에서 UI phase 도출
 */
function derivePhase(
  nodeType: string | null,
  result: ServerResultV1 | null,
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

const NODE_TRANSITION_DELAY_MS = 1500;
const LLM_POLL_INTERVAL_MS = 2000;
const LLM_POLL_MAX_ATTEMPTS = 15; // 최대 30초

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return `[${err.code}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * 내레이터 텍스트 확정 — pending은 flush하지 않음 (타이핑 애니메이션 완료 후 flushPending으로 처리)
 */
function flushNarrator(
  text: string,
  turnNo: number,
  get: () => GameState,
  set: (partial: Partial<GameState>) => void,
) {
  const targetId = `narrator-${turnNo}`;
  const messages = get().messages.map((msg) =>
    msg.id === targetId ? { ...msg, text, loading: false } : msg,
  );
  set({ messages });
}

/**
 * LLM 내러티브 폴링 — NARRATOR 메시지를 LLM 생성 텍스트로 교체
 */
function pollForNarrative(
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
        flushNarrator(detail.llm.output!, turnNo, get, set);
        return;
      }

      if (detail.llm.status === 'FAILED' || attempts >= LLM_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        flushNarrator(fallbackText, turnNo, get, set);
        return;
      }
    } catch {
      // 네트워크 오류 시 계속 시도, 최대 횟수 초과 시 fallback
      if (attempts >= LLM_POLL_MAX_ATTEMPTS) {
        clearInterval(timer);
        flushNarrator(fallbackText, turnNo, get, set);
      }
    }
  }, LLM_POLL_INTERVAL_MS);
}

/**
 * Process a SubmitTurnResponse and apply its effects to the store.
 * Shared by both submitAction and submitChoice.
 */
function processTurnResponse(
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

  // Extract choices from result
  const newChoices: Choice[] = (result.choices ?? []).map((c) => ({
    id: c.id,
    label: c.label,
  }));

  const hasLlmPending = turnRes.llm?.status === 'PENDING' && !hasTransition;

  if (hasLlmPending) {
    // 내레이터 + 판정 결과 먼저 표시, 나머지는 내레이션 완료 후 flush
    const immediateMsgs = newMessages.filter((m) => m.type === 'NARRATOR' || m.type === 'RESOLVE');
    const otherMsgs = newMessages.filter((m) => m.type !== 'NARRATOR' && m.type !== 'RESOLVE');

    set({
      messages: [...get().messages, ...immediateMsgs],
      pendingMessages: otherMsgs,
      hud: updatedHud,
      inventory: updatedInventory,
      choices: [],
      pendingChoices: newChoices,
      currentTurnNo: turnRes.turnNo + 1,
      isSubmitting: false,
    });

    const runId = get().runId;
    if (runId) {
      pollForNarrative(runId, turnRes.turnNo, result.summary?.display ?? result.summary?.short ?? '', get, set);
    }
  } else {
    // LLM 없음 또는 노드 전이 — 모든 메시지 즉시 표시
    set({
      messages: [...get().messages, ...newMessages],
      pendingMessages: [],
      hud: updatedHud,
      inventory: updatedInventory,
      choices: hasTransition ? [] : newChoices,
      pendingChoices: [],
      currentTurnNo: turnRes.turnNo + 1,
      isSubmitting: false,
    });
  }

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
  }

  // ResolveOutcome 업데이트
  const resolveOutcome = result.ui?.resolveOutcome as ResolveOutcome | undefined;
  set({ resolveOutcome: resolveOutcome ?? null });

  // Handle node / run outcome
  const outcome = turnRes.meta?.nodeOutcome;

  if (outcome === 'RUN_ENDED') {
    set({ phase: 'RUN_ENDED' });
    return;
  }

  if (outcome === 'NODE_ENDED' || turnRes.transition) {
    // 전환 화면 없이 즉시 다음 노드로 전환
    if (turnRes.transition) {
      const t = turnRes.transition;
      const enterMessages = mapResultToMessages(t.enterResult);
      const enterChoices: Choice[] = (
        t.enterResult.choices ?? []
      ).map((c) => ({ id: c.id, label: c.label }));

      const narratorMsgs = enterMessages.filter((m) => m.type === 'NARRATOR');
      const systemMsgs = enterMessages.filter((m) => m.type === 'SYSTEM');
      const otherMsgs = enterMessages.filter(
        (m) => m.type !== 'NARRATOR' && m.type !== 'SYSTEM',
      );

      const enterTurnNo = t.enterTurnNo ?? t.enterResult.turnNo;
      const nextPhase = derivePhase(t.nextNodeType, t.enterResult);
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
      });

      const runId = get().runId;
      if (runId) {
        pollForNarrative(
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
            phase: derivePhase(nodeType, null),
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
      const newPhase = derivePhase(nodeType, result);
      if (get().phase !== newPhase) {
        set({ phase: newPhase });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGameStore = create<GameState>((set, get) => ({
  // --- initial state ---
  phase: 'TITLE',
  runId: null,
  currentNodeType: null,
  currentNodeIndex: 0,
  currentTurnNo: 1,
  hud: { ...INITIAL_HUD },
  inventory: [],
  battleState: null,
  messages: [],
  pendingMessages: [],
  choices: [],
  pendingChoices: [],
  isSubmitting: false,
  error: null,
  activeRunInfo: null,
  characterInfo: null,
  worldState: null,
  resolveOutcome: null,
  locationName: null,

  // -----------------------------------------------------------------------
  // checkActiveRun
  // -----------------------------------------------------------------------
  checkActiveRun: async () => {
    try {
      const info = await getActiveRun();
      set({ activeRunInfo: info ?? null });
    } catch {
      set({ activeRunInfo: null });
    }
  },

  // -----------------------------------------------------------------------
  // resumeRun
  // -----------------------------------------------------------------------
  resumeRun: async () => {
    const { activeRunInfo } = get();
    if (!activeRunInfo) return;

    set({ phase: 'LOADING', error: null });

    try {
      const data = (await getRun(activeRunInfo.runId)) as Record<string, unknown>;
      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
      const currentNode = data.currentNode as Record<string, unknown> | undefined;
      const lastResult = data.lastResult as ServerResultV1 | undefined;
      const battleState = data.battleState as unknown | undefined;
      const runState = data.runState as
        | { hp: number; maxHp: number; stamina: number; maxStamina: number; gold: number; inventory?: Array<{ itemId: string; qty: number }> }
        | undefined;
      const turnsArr = data.turns as Array<{
        turnNo: number;
        llmStatus: string;
        llmOutput: string | null;
        summary: string;
      }> | undefined;

      // HUD 복원
      const hud: PlayerHud = runState
        ? {
            hp: runState.hp,
            maxHp: runState.maxHp,
            stamina: runState.stamina,
            maxStamina: runState.maxStamina,
            gold: runState.gold,
          }
        : { ...INITIAL_HUD };

      const restoredInventory: InventoryItem[] = (runState?.inventory ?? []).map((i) => ({
        itemId: i.itemId,
        qty: i.qty,
      }));

      // 마지막 턴의 내러티브와 선택지 복원
      let restoredMessages: StoryMessage[] = [];
      let restoredChoices: Choice[] = [];

      if (lastResult) {
        restoredMessages = mapResultToMessages(lastResult);

        // LLM 내러티브가 완료된 경우 NARRATOR 텍스트 교체
        const lastTurn = turnsArr?.[0];
        if (lastTurn?.llmOutput && lastTurn.llmStatus === 'DONE') {
          restoredMessages = restoredMessages.map((msg) =>
            msg.type === 'NARRATOR'
              ? { ...msg, text: lastTurn.llmOutput!, loading: false }
              : msg,
          );
        } else if (lastTurn) {
          // LLM 미완료 — loading 표시 제거하고 summary fallback
          restoredMessages = restoredMessages.map((msg) =>
            msg.type === 'NARRATOR'
              ? { ...msg, loading: false }
              : msg,
          );
        }

        restoredChoices = (lastResult.choices ?? []).map((c) => ({
          id: c.id,
          label: c.label,
        }));
      }

      const nodeType = (currentNode?.nodeType as string) ?? null;
      const resumePhase = derivePhase(nodeType, lastResult ?? null);
      const resumeWs = lastResult?.ui?.worldState as import('@/types/game').WorldStateUI | undefined;

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
        characterInfo: buildCharacterInfo(
          (run.presetId as string) ?? activeRunInfo.presetId,
          ((run.gender as string) ?? activeRunInfo.gender ?? 'male') as 'male' | 'female',
        ),
        worldState: resumeWs ?? null,
        resolveOutcome: null,
        locationName: null,
      });
    } catch (err) {
      set({
        phase: 'ERROR',
        error: extractErrorMessage(err),
      });
    }
  },

  // -----------------------------------------------------------------------
  // startNewGame
  // -----------------------------------------------------------------------
  startNewGame: async (presetId: string, gender?: 'male' | 'female') => {
    set({ phase: 'LOADING', error: null });

    try {
      const data = (await createRun(presetId, gender)) as Record<string, unknown>;

      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
      const currentNode = data.currentNode as
        | Record<string, unknown>
        | undefined;
      const serverResult = data.lastResult as ServerResultV1 | undefined;
      const battleState = data.battleState as unknown | undefined;
      const runState = data.runState as
        | { hp: number; maxHp: number; stamina: number; maxStamina: number; gold: number; inventory?: Array<{ itemId: string; qty: number }> }
        | undefined;

      // Build initial messages / choices from the enter result
      let initialMessages: StoryMessage[] = [];
      let initialChoices: Choice[] = [];

      if (serverResult) {
        initialMessages = mapResultToMessages(serverResult);
        initialChoices = (serverResult.choices ?? []).map((c) => ({
          id: c.id,
          label: c.label,
        }));
      }

      // 내레이터 메시지(LLM 대기)와 나머지(시스템/선택지)를 분리
      const narratorMsgs = initialMessages.filter((m) => m.type === 'NARRATOR');
      const otherMsgs = initialMessages.filter((m) => m.type !== 'NARRATOR');
      const hasNarratorLoading = narratorMsgs.some((m) => m.loading);

      const hud: PlayerHud = runState
        ? {
            hp: runState.hp,
            maxHp: runState.maxHp,
            stamina: runState.stamina,
            maxStamina: runState.maxStamina,
            gold: runState.gold,
          }
        : { ...INITIAL_HUD };

      const initialInventory: InventoryItem[] = (runState?.inventory ?? []).map((i) => ({
        itemId: i.itemId,
        qty: i.qty,
      }));

      // WorldState 추출
      const wsUI = serverResult?.ui?.worldState as import('@/types/game').WorldStateUI | undefined;
      const nodeType = (currentNode?.nodeType as string) ?? null;
      const initialPhase = derivePhase(nodeType, serverResult ?? null);

      set({
        phase: initialPhase,
        runId,
        currentNodeType: nodeType,
        currentNodeIndex: (currentNode?.nodeIndex as number) ?? 0,
        currentTurnNo: 1,
        hud,
        inventory: initialInventory,
        battleState: battleState ?? null,
        // 내레이터가 로딩 중이면: 시스템 + 내레이터만 표시, 선택지는 pending
        messages: hasNarratorLoading
          ? [...otherMsgs.filter((m) => m.type === 'SYSTEM'), ...narratorMsgs]
          : initialMessages,
        pendingMessages: hasNarratorLoading
          ? otherMsgs.filter((m) => m.type !== 'SYSTEM')
          : [],
        choices: hasNarratorLoading ? [] : initialChoices,
        pendingChoices: hasNarratorLoading ? initialChoices : [],
        isSubmitting: false,
        characterInfo: buildCharacterInfo(presetId, gender),
        worldState: wsUI ?? null,
        resolveOutcome: null,
        locationName: null,
      });

      // 첫 턴 LLM 폴링 시작
      if (hasNarratorLoading) {
        pollForNarrative(
          runId,
          serverResult!.turnNo,
          serverResult!.summary?.display ?? serverResult!.summary?.short ?? '',
          get,
          set,
        );
      }
    } catch (err) {
      set({
        phase: 'ERROR',
        error: extractErrorMessage(err),
      });
    }
  },

  // -----------------------------------------------------------------------
  // submitAction
  // -----------------------------------------------------------------------
  submitAction: async (text: string) => {
    const { runId, currentTurnNo, isSubmitting } = get();
    if (!runId || isSubmitting) return;

    set({ isSubmitting: true, error: null });

    // Add the player message to the feed immediately
    const playerMsg: StoryMessage = {
      id: crypto.randomUUID(),
      type: 'PLAYER',
      text,
    };
    set({ messages: [...get().messages, playerMsg] });

    try {
      const { currentNodeType } = get();
      const turnRes = await submitTurn(runId, {
        idempotencyKey: crypto.randomUUID(),
        expectedNextTurnNo: currentTurnNo,
        input: { type: 'ACTION', text },
        ...(currentNodeType === 'COMBAT' ? { options: { skipLlm: true } } : {}),
      });

      processTurnResponse(turnRes, get, set);
    } catch (err) {
      set({
        isSubmitting: false,
        error: extractErrorMessage(err),
      });
    }
  },

  // -----------------------------------------------------------------------
  // submitChoice
  // -----------------------------------------------------------------------
  submitChoice: async (choiceId: string) => {
    const { runId, currentTurnNo, isSubmitting } = get();
    if (!runId || isSubmitting) return;

    // 선택한 선택지만 표시되도록 CHOICE 메시지 업데이트
    const updatedMessages = get().messages.map((msg) =>
      msg.type === 'CHOICE' && msg.choices?.some((c) => c.id === choiceId)
        ? { ...msg, selectedChoiceId: choiceId }
        : msg,
    );
    set({ isSubmitting: true, error: null, choices: [], messages: updatedMessages });

    try {
      const { currentNodeType } = get();
      const turnRes = await submitTurn(runId, {
        idempotencyKey: crypto.randomUUID(),
        expectedNextTurnNo: currentTurnNo,
        input: { type: 'CHOICE', choiceId },
        ...(currentNodeType === 'COMBAT' ? { options: { skipLlm: true } } : {}),
      });

      processTurnResponse(turnRes, get, set);
    } catch (err) {
      set({
        isSubmitting: false,
        error: extractErrorMessage(err),
      });
    }
  },

  // -----------------------------------------------------------------------
  // clearError / reset
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // flushPending — 타이핑 애니메이션 완료 후 pending 메시지/선택지를 표시
  // -----------------------------------------------------------------------
  flushPending: () => {
    const { pendingMessages, pendingChoices, messages } = get();
    if (pendingMessages.length === 0 && pendingChoices.length === 0) return;
    set({
      messages: [...messages, ...pendingMessages],
      pendingMessages: [],
      choices: pendingChoices,
      pendingChoices: [],
    });
  },

  clearError: () => {
    const { phase, currentNodeType } = get();
    set({
      error: null,
      // ERROR → 적절한 phase로 복구
      ...(phase === 'ERROR' && get().runId
        ? { phase: derivePhase(currentNodeType, null) }
        : {}),
    });
  },

  reset: () => {
    set({
      phase: 'TITLE',
      runId: null,
      currentNodeType: null,
      currentNodeIndex: 0,
      currentTurnNo: 1,
      hud: { ...INITIAL_HUD },
      inventory: [],
      battleState: null,
      messages: [],
      pendingMessages: [],
      choices: [],
      pendingChoices: [],
      isSubmitting: false,
      error: null,
      activeRunInfo: null,
      characterInfo: null,
      worldState: null,
      resolveOutcome: null,
      locationName: null,
    });
  },
}));
