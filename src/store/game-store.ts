import { create } from 'zustand';
import type {
  PlayerHud,
  StoryMessage,
  Choice,
  ServerResultV1,
  SubmitTurnResponse,
  BattleEnemy,
} from '@/types/game';
import { createRun, getRun, submitTurn, getTurnDetail } from '@/lib/api-client';
import { mapResultToMessages } from '@/lib/result-mapper';
import { applyDiffToHud, applyEnemyDiffs } from '@/lib/hud-mapper';
import { ApiError } from '@/lib/api-errors';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface GameState {
  phase:
    | 'TITLE'
    | 'LOADING'
    | 'PLAYING'
    | 'NODE_TRANSITION'
    | 'RUN_ENDED'
    | 'ERROR';
  runId: string | null;
  currentNodeType: string | null;
  currentNodeIndex: number;
  currentTurnNo: number;
  hud: PlayerHud;
  battleState: unknown | null;
  messages: StoryMessage[];
  pendingMessages: StoryMessage[];
  choices: Choice[];
  pendingChoices: Choice[];
  isSubmitting: boolean;
  error: string | null;

  // actions
  startNewGame: () => Promise<void>;
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
  const allMessages = mapResultToMessages(result);
  const hasTransition = turnRes.meta?.nodeOutcome === 'NODE_ENDED' || !!turnRes.transition;
  const newMessages = hasTransition
    ? allMessages.filter((m) => m.type !== 'NARRATOR')
    : allMessages;

  // Apply diff to HUD
  const updatedHud = result.diff
    ? applyDiffToHud(get().hud, result.diff)
    : get().hud;

  // Extract choices from result
  const newChoices: Choice[] = (result.choices ?? []).map((c) => ({
    id: c.id,
    label: c.label,
  }));

  const hasLlmPending = turnRes.llm?.status === 'PENDING' && !hasTransition;

  if (hasLlmPending) {
    // 내레이터만 먼저 표시, 나머지는 내레이션 완료 후 flush
    const narratorMsgs = newMessages.filter((m) => m.type === 'NARRATOR');
    const otherMsgs = newMessages.filter((m) => m.type !== 'NARRATOR');

    set({
      messages: [...get().messages, ...narratorMsgs],
      pendingMessages: otherMsgs,
      hud: updatedHud,
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

  // Handle node / run outcome
  const outcome = turnRes.meta?.nodeOutcome;

  if (outcome === 'RUN_ENDED') {
    set({ phase: 'RUN_ENDED' });
    return;
  }

  if (outcome === 'NODE_ENDED' || turnRes.transition) {
    set({ phase: 'NODE_TRANSITION' });

    // After a short delay, load the next node
    setTimeout(async () => {
      try {
        if (turnRes.transition) {
          // Use inline transition data
          const t = turnRes.transition;
          // narrator prefix → LLM 폴링 대상 (loading 표시)
          const enterMessages = mapResultToMessages(t.enterResult);
          const enterChoices: Choice[] = (
            t.enterResult.choices ?? []
          ).map((c) => ({ id: c.id, label: c.label }));

          // 내레이터 vs 나머지 분리
          const narratorMsgs = enterMessages.filter((m) => m.type === 'NARRATOR');
          const systemMsgs = enterMessages.filter((m) => m.type === 'SYSTEM');
          const otherMsgs = enterMessages.filter(
            (m) => m.type !== 'NARRATOR' && m.type !== 'SYSTEM',
          );

          const enterTurnNo = t.enterTurnNo ?? t.enterResult.turnNo;

          set({
            phase: 'PLAYING',
            currentNodeType: t.nextNodeType,
            currentNodeIndex: t.nextNodeIndex,
            battleState: t.battleState ?? null,
            messages: [...get().messages, ...systemMsgs, ...narratorMsgs],
            pendingMessages: otherMsgs,
            choices: [],
            pendingChoices: enterChoices,
            currentTurnNo: enterTurnNo + 1,
          });

          // enter 내레이션 LLM 폴링
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
          // Fallback: re-fetch the run to get fresh state
          const runId = get().runId;
          if (!runId) return;

          const runData = (await getRun(runId)) as Record<string, unknown>;
          const currentNode = runData.currentNode as
            | Record<string, unknown>
            | undefined;

          set({
            phase: 'PLAYING',
            currentNodeType: (currentNode?.type as string) ?? null,
            currentNodeIndex: (currentNode?.index as number) ?? 0,
            battleState: (runData.battleState as unknown) ?? null,
          });
        }
      } catch (err) {
        set({
          phase: 'ERROR',
          error: extractErrorMessage(err),
        });
      }
    }, NODE_TRANSITION_DELAY_MS);
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
  battleState: null,
  messages: [],
  pendingMessages: [],
  choices: [],
  pendingChoices: [],
  isSubmitting: false,
  error: null,

  // -----------------------------------------------------------------------
  // startNewGame
  // -----------------------------------------------------------------------
  startNewGame: async () => {
    set({ phase: 'LOADING', error: null });

    try {
      const data = (await createRun()) as Record<string, unknown>;

      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
      const currentNode = data.currentNode as
        | Record<string, unknown>
        | undefined;
      const serverResult = data.lastResult as ServerResultV1 | undefined;
      const battleState = data.battleState as unknown | undefined;
      const runState = data.runState as
        | { hp: number; maxHp: number; stamina: number; maxStamina: number; gold: number }
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

      set({
        phase: 'PLAYING',
        runId,
        currentNodeType: (currentNode?.nodeType as string) ?? null,
        currentNodeIndex: (currentNode?.nodeIndex as number) ?? 0,
        currentTurnNo: 1,
        hud,
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
      const turnRes = await submitTurn(runId, {
        idempotencyKey: crypto.randomUUID(),
        expectedNextTurnNo: currentTurnNo,
        input: { type: 'ACTION', text },
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
      const turnRes = await submitTurn(runId, {
        idempotencyKey: crypto.randomUUID(),
        expectedNextTurnNo: currentTurnNo,
        input: { type: 'CHOICE', choiceId },
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
    const { phase } = get();
    set({
      error: null,
      // Only recover from ERROR phase → PLAYING when there is an active run
      ...(phase === 'ERROR' && get().runId ? { phase: 'PLAYING' } : {}),
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
      battleState: null,
      messages: [],
      pendingMessages: [],
      choices: [],
      pendingChoices: [],
      isSubmitting: false,
      error: null,
    });
  },
}));
