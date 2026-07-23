import { create } from 'zustand';
import type {
  PlayerHud,
  StoryMessage,
  Choice,
  CharacterInfo,
  ServerResultV1,
  InventoryItem,
  InventoryChanges,
  WorldStateUI,
  ResolveOutcome,
  IncidentSummaryUI,
  SignalFeedItemUI,
  OperationProgressUI,
  NpcEmotionalUI,
  EndingResult,
  GameNotification,
  WorldDeltaSummaryUI,
  ArcStateUI,
  NarrativeMarkUI,
  MainArcClockUI,
  PlayerThreadSummaryUI,
  PlayerGoalUI,
  LocationDynamicStateUI,
  EquipmentBagItem,
  EndingSummary,
  EndingSummaryCard,
} from '@/types/game';
import { createRun, getActiveRun, getRun, abortRun as apiAbortRun, submitTurn, retryLlm, generateSceneImage, getSceneImageStatus, listSceneImages, equipItem as apiEquipItem, unequipItem as apiUnequipItem, useItem as apiUseItem, getEndings, getEndingDetail, submitPartyAction as apiSubmitPartyAction, getPartyRunState, type LlmTokenStats } from '@/lib/api-client';
import { usePartyStore } from '@/store/party-store';
import { useAuthStore } from '@/store/auth-store';
import { mapResultToMessages } from '@/lib/result-mapper';
import { ApiError } from '@/lib/api-errors';
import { usePointsStore } from '@/store/points-store';
import { type StreamOutput } from '@/lib/stream-parser';
import { uiLog } from '@/lib/ui-logger';


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
    | 'ERROR'
    | 'ENDINGS_LIST'
    | 'ENDINGS_DETAIL';
  runId: string | null;
  /** 파티 던전 컨텍스트 (arch/84) — 세팅되면 턴 제출을 파티 엔드포인트로 라우팅. */
  partyContext: { partyId: string; partyRunId: string } | null;
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
  activeRunInfo: {
    runId: string;
    presetId: string;
    presetName?: string;
    characterName?: string;
    gender: 'male' | 'female';
    currentTurnNo: number;
  } | null;
  characterInfo: CharacterInfo | null;
  // HUB 전용 상태
  worldState: WorldStateUI | null;
  resolveOutcome: ResolveOutcome | null;
  locationName: string | null;
  /** architecture/63 ⑥ — 현재 런의 시나리오 팩 ID (HUB 라벨·프리셋 표기용) */
  scenarioId: string | null;
  llmStats: (LlmTokenStats & { model: string | null }) | null;
  llmFailure: { message: string; provider?: string; turnNo: number } | null;
  inventoryChanges: InventoryChanges | null;
  // Narrative Engine v1
  signalFeed: SignalFeedItemUI[];
  pendingNewsSignals: SignalFeedItemUI[];
  activeIncidents: IncidentSummaryUI[];
  operationProgress: OperationProgressUI | null;
  npcEmotional: NpcEmotionalUI[];
  /** 현재 장소 상점 진열 (arch/68 부록 E) — LOCATION 턴마다 갱신 */
  shops: import('@/types/game').ShopDisplayUI[];
  endingResult: EndingResult | null;
  // Notification System
  notifications: GameNotification[];
  pinnedAlerts: GameNotification[];
  worldDeltaSummary: WorldDeltaSummaryUI | null;
  // Quest / Arc State
  arcState: ArcStateUI | null;
  narrativeMarks: NarrativeMarkUI[];
  mainArcClock: MainArcClockUI | null;
  playerThreads: PlayerThreadSummaryUI[];
  day: number;
  // Player Goals & Location Dynamic States
  playerGoals: PlayerGoalUI[];
  locationDynamicStates: Record<string, LocationDynamicStateUI>;
  // Equipment Bag (미장착 장비)
  equipmentBag: EquipmentBagItem[];
  /** 이번 턴에 새로 획득한 장비 (토스트 배너용, 2~3초 후 clear) */
  recentEquipmentDrops: EquipmentBagItem[];
  // Set Definitions (서버에서 수신)
  setDefinitions: Array<{
    setId: string;
    name: string;
    type: string;
    pieces: string[];
    bonus2: { description: string };
    bonus3: { description: string };
  }>;
  // Scene Image
  sceneImages: Record<number, string>;
  sceneImageRemaining: number;
  sceneImageLoading: Record<number, boolean>;

  // LLM Streaming
  isStreaming: boolean;
  streamSegments: StreamOutput[];
  streamDisconnect: (() => void) | null;
  /** done 이벤트 후 최종 서술 (StreamingBlock 타이핑 완료 대기용) */
  /** Track 2 진행 중 (선택지 생성 대기) */
  choicesLoading: boolean;
  /** 내레이터가 타이핑 애니메이션 진행 중 (선택지 표시 억제용) */
  isNarrating: boolean;
  /** 스트리밍 텍스트 버퍼 — 분석 완료된 텍스트 누적, 컴포넌트가 한 글자씩 소비 */
  streamTextBuffer: string;
  /** 스트리밍 완료 여부 (done 수신 + 버퍼 최종 확정) */
  streamBufferDone: boolean;
  /** StreamingBlock 타이핑 완료 후 호출 — 최종 서술 교체 + 선택지 표시 */


  // Campaign
  campaignId: string | null;

  // Journey Archive (엔딩 기록 열람)
  archivedEndings: EndingSummaryCard[];
  archiveCursor: string | null;
  archiveTotal: number;
  archiveLoading: boolean;
  archiveError: string | null;
  activeSummary: EndingSummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  endingsCount: number;
  loadEndings: (append?: boolean) => Promise<void>;
  loadSummary: (runId: string) => Promise<void>;
  clearSummary: () => void;

  // actions
  checkActiveRun: () => Promise<void>;
  resumeRun: () => Promise<void>;
  /** 파티 던전 진입/재접속 — 리더 소유 런 상태를 파티 경로로 복원 (arch/84). */
  resumePartyRun: (partyId: string, partyRunId: string) => Promise<void>;
  /** 파티 통합 판정 결과(dungeon:turn_resolved) 반영 (arch/84). */
  applyPartyTurnResult: (payload: { turnNo: number; serverResult: unknown; llmStatus?: string }) => void;
  abortActiveRun: () => Promise<void>;
  startNewGame: (presetId: string, gender?: 'male' | 'female', options?: { characterName?: string; bonusStats?: Record<string, number>; traitId?: string; portraitUrl?: string; scenarioId?: string }) => Promise<void>;
  startCampaignRun: (campaignId: string, scenarioId: string, presetId?: string, gender?: 'male' | 'female', options?: { characterName?: string; bonusStats?: Record<string, number>; traitId?: string; portraitUrl?: string }) => Promise<void>;
  submitAction: (text: string) => Promise<void>;
  submitChoice: (choiceId: string) => Promise<void>;
  flushPending: () => void;
  clearError: () => void;
  dismissLlmFailure: () => void;
  retryLlmNarrative: () => Promise<void>;
  skipLlmNarrative: () => void;
  clearInventoryChanges: () => void;
  clearRecentEquipmentDrops: () => void;
  equipItem: (instanceId: string) => Promise<void>;
  unequipItem: (slot: string) => Promise<void>;
  useItem: (itemId: string) => Promise<void>;
  requestSceneImage: (turnNo: number) => Promise<void>;
  fetchSceneImageStatus: () => Promise<void>;

  // architecture/42 전투 UI 버튼 폼 — 타겟 선택 + 펼침 패널
  combatSelectedTargetId: string | null;
  combatLastAttackedTargetId: string | null;
  combatExpandedPanel: 'none' | 'special' | 'items';
  setCombatTarget: (id: string | null) => void;
  setCombatExpandedPanel: (panel: 'none' | 'special' | 'items') => void;

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

// [arch/77 P5b] 상태 매핑·내러티브 파이프라인 헬퍼 — game-store.helpers.ts 정본.
import {
  mapEquippedToDisplay,
  mapEquipmentBag,
  buildCharacterInfo,
  derivePhase,
  extractErrorMessage,
  flushNarrator,
  requestNarrative,
  processTurnResponse,
  applyRunSnapshot,
  applyPartyTurnResult as applyPartyTurnResultHelper,
  type RunStateSnapshot,
} from './game-store.helpers';
import type { PartyActionResponse } from '@/lib/api-client';

// arch/84 — 파티 엔드포인트 응답 케이스 처리. 화면 갱신은 dungeon:turn_resolved
// SSE(applyPartyTurnResult)가 담당하므로, 여기서는 투표/거부/대기 상태만 관리한다.
// isSubmitting은 SSE 도착 시 해제되므로 대기 케이스에서는 유지(중복 제출·입력 잠금).
function handlePartyActionResponse(
  resp: PartyActionResponse,
  set: (partial: Partial<GameState>) => void,
): void {
  if (resp.voteCreated) {
    if (resp.vote) usePartyStore.setState({ currentVote: resp.vote });
    set({ isSubmitting: false });
    return;
  }
  if (resp.leaderOnly) {
    set({
      isSubmitting: false,
      error: resp.message ?? '이 행동은 파티 리더만 진행할 수 있습니다.',
    });
    return;
  }
  // leaderChoice / allSubmitted / accepted(대기) — SSE 대기 (isSubmitting 유지).
}

/** 파티 던전 행동 제출 idempotencyKey 생성. */
function partyIdemKey(runId: string): string {
  return `${runId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useGameStore = create<GameState>((set, get) => ({
  // --- initial state ---
  phase: 'TITLE',
  runId: null,
  partyContext: null,
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
  scenarioId: null,
  llmStats: null,
  llmFailure: null,
  inventoryChanges: null,
  // Narrative Engine v1
  signalFeed: [],
  pendingNewsSignals: [],
  activeIncidents: [],
  operationProgress: null,
  npcEmotional: [],
  shops: [],
  endingResult: null,
  // Notification System
  notifications: [],
  pinnedAlerts: [],
  worldDeltaSummary: null,
  // Quest / Arc State
  arcState: null,
  narrativeMarks: [],
  mainArcClock: null,
  playerThreads: [],
  day: 1,
  // Player Goals & Location Dynamic States
  playerGoals: [],
  locationDynamicStates: {},
  // Equipment Bag
  equipmentBag: [],
  recentEquipmentDrops: [],
  // Set Definitions
  setDefinitions: [],
  // Scene Image
  sceneImages: {},
  sceneImageRemaining: 100,
  sceneImageLoading: {},
  // LLM Streaming
  isStreaming: false,
  streamSegments: [],
  streamDisconnect: null,
  choicesLoading: false,
  isNarrating: false,
  streamTextBuffer: '',
  streamBufferDone: false,
  // architecture/42 전투 UI — 타겟 선택 + 펼침 패널
  combatSelectedTargetId: null,
  combatLastAttackedTargetId: null,
  combatExpandedPanel: 'none',
  setCombatTarget: (id) => {
    set({ combatSelectedTargetId: id });
  },
  setCombatExpandedPanel: (panel) => {
    set((s) => ({
      combatExpandedPanel: s.combatExpandedPanel === panel ? 'none' : panel,
    }));
  },
  // Campaign
  campaignId: null,

  // Journey Archive
  archivedEndings: [],
  archiveCursor: null,
  archiveTotal: 0,
  archiveLoading: false,
  archiveError: null,
  activeSummary: null,
  summaryLoading: false,
  summaryError: null,
  endingsCount: 0,

  loadEndings: async (append = false) => {
    const { archiveCursor, archivedEndings, archiveLoading } = get();
    if (archiveLoading) return;
    set({ archiveLoading: true, archiveError: null });
    try {
      const cursor = append ? archiveCursor ?? undefined : undefined;
      const data = await getEndings(cursor, 20);
      const items = data.items;
      set({
        archivedEndings: append
          ? [...archivedEndings, ...items]
          : items,
        archiveCursor: data.page?.nextCursor ?? null,
        archiveTotal: append
          ? archivedEndings.length + items.length
          : items.length,
        archiveLoading: false,
      });
    } catch (err) {
      set({
        archiveLoading: false,
        archiveError: extractErrorMessage(err),
      });
    }
  },

  loadSummary: async (runId: string) => {
    set({ summaryLoading: true, summaryError: null, activeSummary: null });
    try {
      const summary = await getEndingDetail(runId);
      set({ activeSummary: summary, summaryLoading: false });
    } catch (err) {
      set({
        summaryLoading: false,
        summaryError: extractErrorMessage(err),
      });
    }
  },

  clearSummary: () => {
    set({ activeSummary: null, summaryError: null });
  },

  // -----------------------------------------------------------------------
  // checkActiveRun
  // -----------------------------------------------------------------------
  checkActiveRun: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ activeRunInfo: null, endingsCount: 0 });
      return;
    }
    try {
      const info = await getActiveRun();
      // lastCharacter를 별도 저장 (activeRunInfo에서 분리)
      if (info?.lastCharacter) {
        try {
          localStorage.setItem('graymar_last_character', JSON.stringify(info.lastCharacter));
        } catch { /* ignore */ }
      }
      const endingsCount =
        typeof (info as { endingsCount?: number } | null)?.endingsCount === 'number'
          ? ((info as { endingsCount: number }).endingsCount)
          : 0;
      // P1-C4: any 캐스팅 제거 — activeRunInfo 타입에 맞춰 필수 필드 검증
      const activeRunInfo =
        info?.runId &&
        typeof info.presetId === 'string' &&
        (info.gender === 'male' || info.gender === 'female') &&
        typeof info.currentTurnNo === 'number'
          ? {
              runId: info.runId,
              presetId: info.presetId,
              // 이어하기 라벨용 — 서버 팩 인지 프리셋 이름·캐릭터 이름 (raw ID 노출 방지)
              presetName: typeof info.presetName === 'string' ? info.presetName : undefined,
              characterName:
                typeof info.characterName === 'string' ? info.characterName : undefined,
              gender: info.gender,
              currentTurnNo: info.currentTurnNo,
            }
          : null;
      set({ activeRunInfo, endingsCount });
    } catch {
      set({ activeRunInfo: null });
    }
  },

  // -----------------------------------------------------------------------
  // abortActiveRun — 진행 중 런 포기 (arch/70 §3.3). 이후 activeRunInfo 갱신.
  // -----------------------------------------------------------------------
  abortActiveRun: async () => {
    const { activeRunInfo } = get();
    if (!activeRunInfo) return;
    await apiAbortRun(activeRunInfo.runId);
    await get().checkActiveRun(); // 활성 런 재조회 → null 로 갱신
  },

  // -----------------------------------------------------------------------
  // resumeRun
  // -----------------------------------------------------------------------
  resumeRun: async () => {
    const { activeRunInfo } = get();
    if (!activeRunInfo) return;

    set({ phase: 'LOADING', error: null });

    try {
      const data = (await getRun(activeRunInfo.runId, { turnsLimit: 50 })) as Record<string, unknown>;
      applyRunSnapshot(
        data,
        { presetId: activeRunInfo.presetId, gender: activeRunInfo.gender },
        {},
        get,
        set,
      );
    } catch (err) {
      set({
        phase: 'ERROR',
        error: extractErrorMessage(err),
      });
    }
  },

  // -----------------------------------------------------------------------
  // resumePartyRun (arch/84) — 파티 던전 진입/재접속. 멤버는 리더 소유 런을
  // 솔로 getRun으로 못 읽어 파티 경로(getPartyRunState)로 복원한다.
  // -----------------------------------------------------------------------
  resumePartyRun: async (partyId: string, partyRunId: string) => {
    set({ phase: 'LOADING', error: null });
    try {
      const data = (await getPartyRunState(partyId, partyRunId, {
        turnsLimit: 50,
      })) as Record<string, unknown>;
      applyRunSnapshot(data, null, { partyContext: { partyId, partyRunId } }, get, set);
    } catch (err) {
      set({ phase: 'ERROR', error: extractErrorMessage(err) });
    }
  },

  // -----------------------------------------------------------------------
  // applyPartyTurnResult (arch/84) — dungeon:turn_resolved SSE 반영.
  // party-store 핸들러에서 호출 (단방향 store 참조).
  // -----------------------------------------------------------------------
  applyPartyTurnResult: (payload) => {
    const { partyContext } = get();
    if (!partyContext) return;
    applyPartyTurnResultHelper(
      partyContext.partyId,
      partyContext.partyRunId,
      payload,
      get,
      set,
    );
  },

  // -----------------------------------------------------------------------
  // startNewGame
  // -----------------------------------------------------------------------
  startNewGame: async (presetId: string, gender?: 'male' | 'female', options?: { characterName?: string; bonusStats?: Record<string, number>; traitId?: string; portraitUrl?: string; scenarioId?: string }) => {
    // 이전 런 데이터 초기화 (이전 캐릭터로 시작 시 잔류 방지)
    set({ phase: 'LOADING', error: null, messages: [], choices: [], pendingMessages: [], pendingChoices: [] });

    try {
      const data = (await createRun(presetId, gender, options)) as Record<string, unknown>;

      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
      set({ scenarioId: (run.scenarioId as string | undefined) ?? null });
      const currentNode = data.currentNode as
        | Record<string, unknown>
        | undefined;
      const serverResult = data.lastResult as ServerResultV1 | undefined;
      const battleState = data.battleState as unknown | undefined;
      const runState = data.runState as
        | RunStateSnapshot
        | undefined;

      // Build initial messages / choices from the enter result
      let initialMessages: StoryMessage[] = [];
      let initialChoices: Choice[] = [];

      // 튜토리얼: 첫 게임 시작 시 스탯-행동 안내
      const tutorialMessage: StoryMessage = {
        id: 'tutorial_stats',
        type: 'SYSTEM',
        text: '💡 능력치 안내\n\n' +
          '• 힘(STR) — 전투, 협박\n' +
          '• 민첩(DEX) — 잠입, 절도, 회피\n' +
          '• 재치(WIT) — 조사, 수색\n' +
          '• 체질(CON) — 방어, 도움\n' +
          '• 통찰(PER) — 관찰, 발견\n' +
          '• 카리스마(CHA) — 설득, 뇌물, 거래\n\n' +
          '행동의 성패는 1d6 + 능력치 보너스로 결정됩니다. 캐릭터의 강점을 살려 행동하세요.\n\n' +
          '선택지는 제안일 뿐 — 하고 싶은 행동을 입력창에 문장으로 직접 쓸 수 있습니다.',
      };
      initialMessages.push(tutorialMessage);

      if (serverResult) {
        initialMessages = mapResultToMessages(serverResult);
        initialChoices = (serverResult.choices ?? []).map((c) => ({
          id: c.id,
          label: c.label,
          affordance: c.action?.payload?.affordance as string | undefined,
          hint: c.hint,
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
      const initialPhase = derivePhase(nodeType);

      // Quest / Arc / Narrative State 추출 (resumeRun 패턴)
      const rsAny = runState as Record<string, unknown> | undefined;
      const wsObj = (rsAny?.worldState ?? {}) as Record<string, unknown>;

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
        characterInfo: {
          ...buildCharacterInfo(
            presetId,
            gender,
            options,
            (run.scenarioId as string | undefined) ?? null,
            (data.stats as Record<string, number> | null | undefined) ?? undefined,
          ),
          equipment: mapEquippedToDisplay(runState?.equipped),
        },
        equipmentBag: mapEquipmentBag(runState?.equipmentBag),
        setDefinitions: (data.setDefinitions as GameState['setDefinitions']) ?? [],
        worldState: wsUI ?? null,
        resolveOutcome: null,
        locationName: null,
        // Quest / Arc State (runState에서 추출)
        arcState: (rsAny?.arcState as ArcStateUI) ?? null,
        narrativeMarks: (wsObj?.narrativeMarks as NarrativeMarkUI[]) ?? [],
        mainArcClock: (wsObj?.mainArcClock as MainArcClockUI) ?? null,
        playerThreads: (wsObj?.playerThreads as PlayerThreadSummaryUI[]) ?? [],
        day: (wsObj?.day as number) ?? 1,
        playerGoals: (wsObj?.playerGoals as PlayerGoalUI[]) ?? (wsUI?.playerGoals ?? []),
        locationDynamicStates: (wsObj?.locationDynamicStates as Record<string, LocationDynamicStateUI>) ?? (wsUI?.locationDynamicStates ?? {}),
        // Narrative Engine 상태
        activeIncidents: (wsObj?.activeIncidents as IncidentSummaryUI[]) ?? [],
        signalFeed: (wsObj?.signalFeed as SignalFeedItemUI[]) ?? [],
      });

      // 첫 턴 LLM 내러티브 요청 (스트리밍 또는 폴링)
      if (hasNarratorLoading) {
        requestNarrative(
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
  // startCampaignRun
  // -----------------------------------------------------------------------
  startCampaignRun: async (campaignId: string, scenarioId: string, presetId?: string, gender?: 'male' | 'female', options?: { characterName?: string; bonusStats?: Record<string, number>; traitId?: string; portraitUrl?: string }) => {
    set({ phase: 'LOADING', error: null, campaignId });

    try {
      // architecture/71 §4.3: 첫 시나리오 캐릭터 생성의 identity 필드 전달
      const data = (await createRun(presetId, gender, { campaignId, scenarioId, ...options })) as Record<string, unknown>;

      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
      set({ scenarioId: (run.scenarioId as string | undefined) ?? null });
      const currentNode = data.currentNode as
        | Record<string, unknown>
        | undefined;
      const serverResult = data.lastResult as ServerResultV1 | undefined;
      const battleState = data.battleState as unknown | undefined;
      const runState = data.runState as
        | RunStateSnapshot
        | undefined;

      let initialMessages: StoryMessage[] = [];
      let initialChoices: Choice[] = [];

      if (serverResult) {
        initialMessages = mapResultToMessages(serverResult);
        initialChoices = (serverResult.choices ?? []).map((c) => ({
          id: c.id,
          label: c.label,
          affordance: c.action?.payload?.affordance as string | undefined,
          hint: c.hint,
        }));
      }

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

      const wsUI = serverResult?.ui?.worldState as import('@/types/game').WorldStateUI | undefined;
      const nodeType = (currentNode?.nodeType as string) ?? null;
      const initialPhase = derivePhase(nodeType);

      // Quest / Arc / Narrative State 추출 (resumeRun 패턴)
      const rsAny = runState as Record<string, unknown> | undefined;
      const wsObj = (rsAny?.worldState ?? {}) as Record<string, unknown>;

      set({
        phase: initialPhase,
        runId,
        campaignId,
        currentNodeType: nodeType,
        currentNodeIndex: (currentNode?.nodeIndex as number) ?? 0,
        currentTurnNo: 1,
        hud,
        inventory: initialInventory,
        battleState: battleState ?? null,
        messages: hasNarratorLoading
          ? [...otherMsgs.filter((m) => m.type === 'SYSTEM'), ...narratorMsgs]
          : initialMessages,
        pendingMessages: hasNarratorLoading
          ? otherMsgs.filter((m) => m.type !== 'SYSTEM')
          : [],
        choices: hasNarratorLoading ? [] : initialChoices,
        pendingChoices: hasNarratorLoading ? initialChoices : [],
        isSubmitting: false,
        characterInfo: {
          // arch/71: 이월 캐릭터는 프리셋/성별/이름/스탯을 응답에서 취득(요청엔 없음)
          ...buildCharacterInfo(
            (run.presetId as string | undefined) ?? presetId,
            ((run.gender as string | undefined) ?? gender ?? 'male') as 'male' | 'female',
            {
              characterName: (runState as Record<string, unknown> | undefined)?.characterName as string | undefined,
              portraitUrl: (runState as Record<string, unknown> | undefined)?.portraitUrl as string | undefined,
            },
            (run.scenarioId as string | undefined) ?? null,
            (data.stats as Record<string, number> | null | undefined) ?? undefined,
          ),
          equipment: mapEquippedToDisplay(runState?.equipped),
        },
        equipmentBag: mapEquipmentBag(runState?.equipmentBag),
        setDefinitions: (data.setDefinitions as GameState['setDefinitions']) ?? [],
        worldState: wsUI ?? null,
        resolveOutcome: null,
        locationName: null,
        // Quest / Arc State (runState에서 추출)
        arcState: (rsAny?.arcState as ArcStateUI) ?? null,
        narrativeMarks: (wsObj?.narrativeMarks as NarrativeMarkUI[]) ?? [],
        mainArcClock: (wsObj?.mainArcClock as MainArcClockUI) ?? null,
        playerThreads: (wsObj?.playerThreads as PlayerThreadSummaryUI[]) ?? [],
        day: (wsObj?.day as number) ?? 1,
        playerGoals: (wsObj?.playerGoals as PlayerGoalUI[]) ?? (wsUI?.playerGoals ?? []),
        locationDynamicStates: (wsObj?.locationDynamicStates as Record<string, LocationDynamicStateUI>) ?? (wsUI?.locationDynamicStates ?? {}),
        activeIncidents: (wsObj?.activeIncidents as IncidentSummaryUI[]) ?? [],
        signalFeed: (wsObj?.signalFeed as SignalFeedItemUI[]) ?? [],
      });

      if (hasNarratorLoading) {
        requestNarrative(
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

    set({ isSubmitting: true, error: null, choices: [] });

    // Add the player message to the feed immediately
    const playerMsg: StoryMessage = {
      id: crypto.randomUUID(),
      type: 'PLAYER',
      text,
    };
    set({ messages: [...get().messages, playerMsg] });

    // arch/84 — 파티 던전이면 파티 엔드포인트로 라우팅 (리더/멤버 공통).
    const partyCtx = get().partyContext;
    if (partyCtx) {
      try {
        const resp = await apiSubmitPartyAction(
          partyCtx.partyId,
          partyCtx.partyRunId,
          'ACTION',
          text,
          partyIdemKey(partyCtx.partyRunId),
        );
        handlePartyActionResponse(resp, set);
      } catch (err) {
        set({ isSubmitting: false, error: extractErrorMessage(err) });
      }
      return;
    }

    try {
      const { currentNodeType } = get();
      const turnRes = await submitTurn(runId, {
        idempotencyKey: crypto.randomUUID(),
        expectedNextTurnNo: currentTurnNo,
        input: { type: 'ACTION', text },
        ...(currentNodeType === 'COMBAT' ? { options: { skipLlm: true } } : {}),
      });

      processTurnResponse(turnRes, get, set);
      void usePointsStore.getState().fetchBalance(); // arch/85 — 잔액 동기화
    } catch (err) {
      // PR-C: TURN_NO_MISMATCH 자동 복구 — 서버 turnNo 기준 재동기화 후 재시도
      if (err instanceof ApiError && err.code === 'TURN_NO_MISMATCH') {
        try {
          const runData = (await getRun(runId)) as Record<string, unknown>;
          const run = runData.run as Record<string, unknown> | undefined;
          const serverTurnNo = (run?.currentTurnNo as number) ?? currentTurnNo;
          set({ currentTurnNo: serverTurnNo + 1 });
          // 재시도
          const { currentNodeType: retryNodeType } = get();
          const retryRes = await submitTurn(runId, {
            idempotencyKey: crypto.randomUUID(),
            expectedNextTurnNo: serverTurnNo + 1,
            input: { type: 'ACTION', text },
            ...(retryNodeType === 'COMBAT' ? { options: { skipLlm: true } } : {}),
          });
          processTurnResponse(retryRes, get, set);
          return;
        } catch (retryErr) {
          set({ isSubmitting: false, error: extractErrorMessage(retryErr) });
          return;
        }
      }
      // arch/85 — 포인트 부족(402): 충전 모달 유도 (에러 배너 대신)
      if (err instanceof ApiError && err.status === 402) {
        usePointsStore.getState().openModal('insufficient');
        set({ isSubmitting: false });
        return;
      }
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
    const { runId, currentTurnNo, isSubmitting, choices, messages } = get();
    if (!runId || isSubmitting) return;

    // 선택한 선택지만 표시되도록 CHOICE 메시지 업데이트
    let updatedMessages = messages.map((msg) =>
      msg.type === 'CHOICE' && msg.choices?.some((c) => c.id === choiceId)
        ? { ...msg, selectedChoiceId: choiceId }
        : msg,
    );

    // choices 상태(live-choices)에서 선택된 경우 → messages에 영구 기록
    if (choices.length > 0 && choices.some((c) => c.id === choiceId)) {
      const lastMsg = updatedMessages[updatedMessages.length - 1];
      if (!lastMsg || lastMsg.type !== 'CHOICE') {
        updatedMessages = [
          ...updatedMessages,
          {
            id: `selected-choice-${choiceId}`,
            type: 'CHOICE' as const,
            text: '',
            choices,
            selectedChoiceId: choiceId,
          },
        ];
      }
    }

    set({ isSubmitting: true, error: null, choices: [], messages: updatedMessages });

    // arch/84 — 파티 던전이면 파티 엔드포인트로 라우팅. CHOICE는 rawInput에
    // choiceId 문자열을 넣는다(서버가 inputType==='CHOICE'로 구분, go_ 접두 검사).
    const partyCtx = get().partyContext;
    if (partyCtx) {
      try {
        const resp = await apiSubmitPartyAction(
          partyCtx.partyId,
          partyCtx.partyRunId,
          'CHOICE',
          choiceId,
          partyIdemKey(partyCtx.partyRunId),
        );
        handlePartyActionResponse(resp, set);
      } catch (err) {
        set({ isSubmitting: false, error: extractErrorMessage(err) });
      }
      return;
    }

    try {
      const { currentNodeType } = get();
      const turnRes = await submitTurn(runId, {
        idempotencyKey: crypto.randomUUID(),
        expectedNextTurnNo: currentTurnNo,
        input: { type: 'CHOICE', choiceId },
        ...(currentNodeType === 'COMBAT' ? { options: { skipLlm: true } } : {}),
      });

      processTurnResponse(turnRes, get, set);
      void usePointsStore.getState().fetchBalance(); // arch/85 — 잔액 동기화
    } catch (err) {
      // PR-C: TURN_NO_MISMATCH 자동 복구
      if (err instanceof ApiError && err.code === 'TURN_NO_MISMATCH') {
        try {
          const runData = (await getRun(runId)) as Record<string, unknown>;
          const run = runData.run as Record<string, unknown> | undefined;
          const serverTurnNo = (run?.currentTurnNo as number) ?? currentTurnNo;
          set({ currentTurnNo: serverTurnNo + 1 });
          const { currentNodeType: retryNodeType } = get();
          const retryRes = await submitTurn(runId, {
            idempotencyKey: crypto.randomUUID(),
            expectedNextTurnNo: serverTurnNo + 1,
            input: { type: 'CHOICE', choiceId },
            ...(retryNodeType === 'COMBAT' ? { options: { skipLlm: true } } : {}),
          });
          processTurnResponse(retryRes, get, set);
          return;
        } catch (retryErr) {
          set({ isSubmitting: false, error: extractErrorMessage(retryErr) });
          return;
        }
      }
      // arch/85 — 포인트 부족(402): 충전 모달 유도 (에러 배너 대신)
      if (err instanceof ApiError && err.status === 402) {
        usePointsStore.getState().openModal('insufficient');
        set({ isSubmitting: false });
        return;
      }
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
    uiLog('flush', 'flushPending', {
      pendingMsgCount: pendingMessages.length,
      pendingChoiceCount: pendingChoices.length,
      msgCount: messages.length,
      msgIds: messages.map(m => m.id),
      narratorTexts: messages.filter(m => m.type === 'NARRATOR').map(m => ({ id: m.id, len: m.text?.length ?? 0, loading: m.loading, typed: !!(m as { typed?: boolean }).typed })),
    });
    if (pendingMessages.length === 0 && pendingChoices.length === 0) return;
    set({
      messages: [...messages, ...pendingMessages],
      pendingMessages: [],
      choices: pendingChoices,
      pendingChoices: [],
      isNarrating: false,
    });
  },

  clearError: () => {
    const { phase, currentNodeType } = get();
    set({
      error: null,
      // ERROR → 적절한 phase로 복구
      ...(phase === 'ERROR' && get().runId
        ? { phase: derivePhase(currentNodeType) }
        : {}),
    });
  },

  dismissLlmFailure: () => {
    set({ llmFailure: null });
  },

  retryLlmNarrative: async () => {
    const { runId, llmFailure } = get();
    if (!runId || !llmFailure) return;

    const { turnNo } = llmFailure;
    set({ llmFailure: null });

    try {
      await retryLlm(runId, turnNo);
      // 재시도 성공 → 내러티브 재요청 (스트리밍 또는 폴링)
      requestNarrative(runId, turnNo, '', get, set);
    } catch {
      set({
        llmFailure: {
          message: 'LLM 재시도 요청에 실패했습니다.',
          turnNo,
        },
      });
    }
  },

  skipLlmNarrative: () => {
    const { llmFailure } = get();
    if (!llmFailure) return;

    const { turnNo } = llmFailure;
    set({ llmFailure: null, isNarrating: false });

    // 로딩 중인 narrator를 fallback 텍스트로 교체하고 pending flush
    flushNarrator('...', turnNo, get, set);
    get().flushPending();
  },

  // -----------------------------------------------------------------------
  // equipItem — 장비 가방에서 아이템 장착
  // -----------------------------------------------------------------------
  equipItem: async (instanceId: string) => {
    const { runId, isSubmitting } = get();
    if (!runId || isSubmitting) return;

    set({ isSubmitting: true, error: null });

    try {
      const res = await apiEquipItem(runId, instanceId);
      const currentCharInfo = get().characterInfo;
      if (currentCharInfo) {
        set({
          characterInfo: {
            ...currentCharInfo,
            equipment: mapEquippedToDisplay(res.equipped),
          },
          equipmentBag: mapEquipmentBag(res.equipmentBag),
          isSubmitting: false,
        });
      } else {
        set({ isSubmitting: false });
      }
    } catch (err) {
      set({ isSubmitting: false, error: extractErrorMessage(err) });
    }
  },

  // -----------------------------------------------------------------------
  // unequipItem — 장착된 장비 해제
  // -----------------------------------------------------------------------
  unequipItem: async (slot: string) => {
    const { runId, isSubmitting } = get();
    if (!runId || isSubmitting) return;

    set({ isSubmitting: true, error: null });

    try {
      const res = await apiUnequipItem(runId, slot);
      const currentCharInfo = get().characterInfo;
      if (currentCharInfo) {
        set({
          characterInfo: {
            ...currentCharInfo,
            equipment: mapEquippedToDisplay(res.equipped),
          },
          equipmentBag: mapEquipmentBag(res.equipmentBag),
          isSubmitting: false,
        });
      } else {
        set({ isSubmitting: false });
      }
    } catch (err) {
      set({ isSubmitting: false, error: extractErrorMessage(err) });
    }
  },

  // -----------------------------------------------------------------------
  // useItem — 소모품 사용
  // -----------------------------------------------------------------------
  useItem: async (itemId: string) => {
    const { runId, isSubmitting } = get();
    if (!runId || isSubmitting) return;

    set({ isSubmitting: true, error: null });

    try {
      const res = await apiUseItem(runId, itemId);
      set({
        hud: {
          ...get().hud,
          hp: res.hp,
          stamina: res.stamina,
        },
        inventory: res.inventory,
        isSubmitting: false,
      });
    } catch (err) {
      set({ isSubmitting: false, error: extractErrorMessage(err) });
    }
  },

  requestSceneImage: async (turnNo: number) => {
    const { runId, sceneImages, sceneImageRemaining, sceneImageLoading } = get();
    if (!runId) return;
    if (sceneImages[turnNo]) return; // already generated
    if (sceneImageRemaining <= 0) return;
    if (sceneImageLoading[turnNo]) return; // already loading

    set({ sceneImageLoading: { ...get().sceneImageLoading, [turnNo]: true } });

    try {
      const resp = await generateSceneImage(runId, turnNo);
      set({
        sceneImages: { ...get().sceneImages, [turnNo]: resp.imageUrl },
        sceneImageRemaining: resp.remainingCount,
        sceneImageLoading: { ...get().sceneImageLoading, [turnNo]: false },
      });
    } catch {
      set({ sceneImageLoading: { ...get().sceneImageLoading, [turnNo]: false } });
    }
  },

  fetchSceneImageStatus: async () => {
    try {
      const resp = await getSceneImageStatus();
      set({ sceneImageRemaining: resp.remaining });
      // 현재 런의 기존 이미지 복원
      const runId = get().runId;
      if (runId) {
        const images = await listSceneImages(runId);
        if (images.length > 0) {
          const restored: Record<number, string> = {};
          for (const img of images) restored[img.turnNo] = img.imageUrl;
          set({ sceneImages: { ...get().sceneImages, ...restored } });
        }
      }
    } catch {
      // ignore
    }
  },

  clearInventoryChanges: () => {
    set({ inventoryChanges: null });
  },

  clearRecentEquipmentDrops: () => {
    set({ recentEquipmentDrops: [] });
  },

  reset: () => {
    // 스트리밍 연결 정리
    const { streamDisconnect } = get();
    if (streamDisconnect) streamDisconnect();

    set({
      phase: 'TITLE',
      runId: null,
      partyContext: null,
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
      llmFailure: null,
      inventoryChanges: null,
      activeRunInfo: null,
      characterInfo: null,
      worldState: null,
      resolveOutcome: null,
      locationName: null,
      // Narrative Engine v1
      signalFeed: [],
      pendingNewsSignals: [],
      activeIncidents: [],
      operationProgress: null,
      npcEmotional: [],
      shops: [],
      endingResult: null,
      // Notification System
      notifications: [],
      pinnedAlerts: [],
      worldDeltaSummary: null,
      // Quest / Arc State
      arcState: null,
      narrativeMarks: [],
      mainArcClock: null,
      playerThreads: [],
      day: 1,
      playerGoals: [],
      locationDynamicStates: {},
      equipmentBag: [],
      recentEquipmentDrops: [],
      setDefinitions: [],
      sceneImages: {},
      sceneImageRemaining: 100,
      sceneImageLoading: {},
      isStreaming: false,
      streamSegments: [],
      streamDisconnect: null,
      campaignId: null,
      archivedEndings: [],
      archiveCursor: null,
      archiveTotal: 0,
      archiveLoading: false,
      archiveError: null,
      activeSummary: null,
      summaryLoading: false,
      summaryError: null,
      endingsCount: 0,
    });
  },
}));
