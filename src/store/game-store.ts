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
} from '@/types/game';
import { createRun, getActiveRun, getRun, submitTurn, getTurnDetail, retryLlm, generateSceneImage, getSceneImageStatus, listSceneImages, equipItem as apiEquipItem, unequipItem as apiUnequipItem, useItem as apiUseItem, type LlmTokenStats } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { PRESETS } from '@/data/presets';
import { ITEM_CATALOG } from '@/data/items';
import { STAT_COLORS } from '@/data/stat-descriptions';
import { mapResultToMessages, mapTurnHistoryToMessages, stripNarratorChoices, type TurnHistoryItem } from '@/lib/result-mapper';
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
  llmStats: (LlmTokenStats & { model: string | null }) | null;
  llmFailure: { message: string; provider?: string; turnNo: number } | null;
  inventoryChanges: InventoryChanges | null;
  // Narrative Engine v1
  signalFeed: SignalFeedItemUI[];
  activeIncidents: IncidentSummaryUI[];
  operationProgress: OperationProgressUI | null;
  npcEmotional: NpcEmotionalUI[];
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

  // Campaign
  campaignId: string | null;

  // actions
  checkActiveRun: () => Promise<void>;
  resumeRun: () => Promise<void>;
  startNewGame: (presetId: string, gender?: 'male' | 'female') => Promise<void>;
  startCampaignRun: (campaignId: string, scenarioId: string, presetId: string, gender?: 'male' | 'female') => Promise<void>;
  submitAction: (text: string) => Promise<void>;
  submitChoice: (choiceId: string) => Promise<void>;
  flushPending: () => void;
  clearError: () => void;
  dismissLlmFailure: () => void;
  retryLlmNarrative: () => Promise<void>;
  skipLlmNarrative: () => void;
  clearInventoryChanges: () => void;
  equipItem: (instanceId: string) => Promise<void>;
  unequipItem: (slot: string) => Promise<void>;
  useItem: (itemId: string) => Promise<void>;
  requestSceneImage: (turnNo: number) => Promise<void>;
  fetchSceneImageStatus: () => Promise<void>;
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

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'var(--text-muted)',
  RARE: 'var(--info-blue)',
  UNIQUE: '#a855f7',
  LEGENDARY: 'var(--gold)',
};

/** 서버 runState에서 수신하는 구조 (인라인 타입 대체) */
type RunStateSnapshot = {
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

function mapEquippedToDisplay(
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

function mapEquipmentBag(
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
        { label: 'STR', value: 12, color: 'var(--hp-red)' },
        { label: 'DEX', value: 10, color: 'var(--gold)' },
        { label: 'WIT', value: 8, color: 'var(--success-green)' },
        { label: 'CON', value: 10, color: 'var(--info-blue)' },
        { label: 'PER', value: 7, color: '#c084fc' },
        { label: 'CHA', value: 8, color: '#f472b6' },
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
      ['STR', 'DEX', 'WIT', 'CON', 'PER', 'CHA'] as const
    ).map((key) => ({
      label: key,
      value: preset.stats[key.toLowerCase()] ?? preset.stats[key] ?? 0,
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
        });
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

  // Apply diff to equipment bag
  const newEquipment = result.diff?.equipmentAdded;
  const updatedEquipmentBag = newEquipment && newEquipment.length > 0
    ? [...get().equipmentBag, ...mapEquipmentBag(newEquipment)]
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
      inventoryChanges: newInventoryChanges,
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
      equipmentBag: updatedEquipmentBag,
      inventoryChanges: newInventoryChanges,
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
    if (wsUI.playerGoals) set({ playerGoals: wsUI.playerGoals });
    if (wsUI.locationDynamicStates) set({ locationDynamicStates: wsUI.locationDynamicStates });
  }

  // Narrative Engine v1 UI 업데이트
  const uiBundle = result.ui as Record<string, unknown> | undefined;
  if (uiBundle) {
    const sf = uiBundle.signalFeed as import('@/types/game').SignalFeedItemUI[] | undefined;
    const ai = uiBundle.activeIncidents as import('@/types/game').IncidentSummaryUI[] | undefined;
    const op = uiBundle.operationProgress as import('@/types/game').OperationProgressUI | undefined;
    const ne = uiBundle.npcEmotional as import('@/types/game').NpcEmotionalUI[] | undefined;
    if (sf) set({ signalFeed: sf });
    if (ai) set({ activeIncidents: ai });
    if (op !== undefined) set({ operationProgress: op ?? null });
    if (ne) set({ npcEmotional: ne });

    // Notification System 업데이트
    const notifs = uiBundle.notifications as GameNotification[] | undefined;
    const pinned = uiBundle.pinnedAlerts as GameNotification[] | undefined;
    const wds = uiBundle.worldDeltaSummary as WorldDeltaSummaryUI | undefined;
    if (notifs) set({ notifications: notifs });
    if (pinned) set({ pinnedAlerts: pinned });
    if (wds !== undefined) set({ worldDeltaSummary: wds ?? null });

    // Quest / Arc State 업데이트
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
  llmStats: null,
  llmFailure: null,
  inventoryChanges: null,
  // Narrative Engine v1
  signalFeed: [],
  activeIncidents: [],
  operationProgress: null,
  npcEmotional: [],
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
  // Set Definitions
  setDefinitions: [],
  // Scene Image
  sceneImages: {},
  sceneImageRemaining: 100,
  sceneImageLoading: {},
  // Campaign
  campaignId: null,

  // -----------------------------------------------------------------------
  // checkActiveRun
  // -----------------------------------------------------------------------
  checkActiveRun: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ activeRunInfo: null });
      return;
    }
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
      const data = (await getRun(activeRunInfo.runId, { turnsLimit: 50 })) as Record<string, unknown>;
      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
      const currentNode = data.currentNode as Record<string, unknown> | undefined;
      const lastResult = data.lastResult as ServerResultV1 | undefined;
      const battleState = data.battleState as unknown | undefined;
      const runState = data.runState as
        | RunStateSnapshot
        | undefined;
      const turnsArr = data.turns as TurnHistoryItem[] | undefined;

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

      // ── 대화 이력 복원 ──
      let restoredMessages: StoryMessage[] = [];
      let restoredChoices: Choice[] = [];

      // 서버는 newest-first → 시간순으로 뒤집기
      const chronological = turnsArr && turnsArr.length > 0 ? [...turnsArr].reverse() : [];

      if (chronological.length > 1) {
        // 마지막 턴 제외한 과거 턴으로 이력 구성
        const pastTurns = chronological.slice(0, -1);
        restoredMessages = mapTurnHistoryToMessages(pastTurns);
      }

      // 마지막 턴: 기존 lastResult 기반 복원 유지
      if (lastResult) {
        const lastTurnMessages = mapResultToMessages(lastResult);
        const lastTurn = chronological.length > 0 ? chronological[chronological.length - 1] : undefined;

        // LLM 내러티브 교체 (선택지 잔여물 제거)
        const finalLastMessages = lastTurn?.llmOutput && lastTurn.llmStatus === 'DONE'
          ? lastTurnMessages.map((msg) =>
              msg.type === 'NARRATOR' ? { ...msg, text: stripNarratorChoices(lastTurn.llmOutput!), loading: false } : msg,
            )
          : lastTurnMessages.map((msg) =>
              msg.type === 'NARRATOR' ? { ...msg, loading: false } : msg,
            );

        restoredMessages = [...restoredMessages, ...finalLastMessages];
        restoredChoices = (lastResult.choices ?? []).map((c) => ({
          id: c.id,
          label: c.label,
          affordance: c.action?.payload?.affordance as string | undefined,
        }));
      }

      const nodeType = (currentNode?.nodeType as string) ?? null;
      const resumePhase = derivePhase(nodeType);
      const resumeWs = lastResult?.ui?.worldState as import('@/types/game').WorldStateUI | undefined;

      // Quest / Arc State 복원 (runState에서 추출)
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
            (run.presetId as string) ?? activeRunInfo.presetId,
            ((run.gender as string) ?? activeRunInfo.gender ?? 'male') as 'male' | 'female',
          ),
          equipment: mapEquippedToDisplay(runState?.equipped),
        },
        equipmentBag: mapEquipmentBag(runState?.equipmentBag),
        setDefinitions: (data.setDefinitions as GameState['setDefinitions']) ?? [],
        worldState: resumeWs ?? null,
        resolveOutcome: null,
        locationName: null,
        // Quest / Arc State
        arcState: (rsAny?.arcState as ArcStateUI) ?? null,
        narrativeMarks: (wsObj?.narrativeMarks as NarrativeMarkUI[]) ?? [],
        mainArcClock: (wsObj?.mainArcClock as MainArcClockUI) ?? null,
        playerThreads: (wsObj?.playerThreads as PlayerThreadSummaryUI[]) ?? [],
        day: (wsObj?.day as number) ?? 1,
        playerGoals: (wsObj?.playerGoals as PlayerGoalUI[]) ?? (resumeWs?.playerGoals ?? []),
        locationDynamicStates: (wsObj?.locationDynamicStates as Record<string, LocationDynamicStateUI>) ?? (resumeWs?.locationDynamicStates ?? {}),
      });
      // 기존 씬 이미지 복원
      get().fetchSceneImageStatus();
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
          '행동의 성패는 1d6 + 능력치 보너스로 결정됩니다. 캐릭터의 강점을 살려 행동하세요.',
      };
      initialMessages.push(tutorialMessage);

      if (serverResult) {
        initialMessages = mapResultToMessages(serverResult);
        initialChoices = (serverResult.choices ?? []).map((c) => ({
          id: c.id,
          label: c.label,
          affordance: c.action?.payload?.affordance as string | undefined,
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
          ...buildCharacterInfo(presetId, gender),
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
  // startCampaignRun
  // -----------------------------------------------------------------------
  startCampaignRun: async (campaignId: string, scenarioId: string, presetId: string, gender?: 'male' | 'female') => {
    set({ phase: 'LOADING', error: null, campaignId });

    try {
      const data = (await createRun(presetId, gender, { campaignId, scenarioId })) as Record<string, unknown>;

      const run = data.run as Record<string, unknown>;
      const runId = run.id as string;
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
          ...buildCharacterInfo(presetId, gender),
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
      // 재시도 성공 → 폴링 재시작
      pollForNarrative(runId, turnNo, '', get, set);
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
    set({ llmFailure: null });

    // 로딩 중인 narrator를 fallback 텍스트로 교체하고 pending flush
    flushNarrator('...', turnNo, get, set);
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
      llmFailure: null,
      inventoryChanges: null,
      activeRunInfo: null,
      characterInfo: null,
      worldState: null,
      resolveOutcome: null,
      locationName: null,
      // Narrative Engine v1
      signalFeed: [],
      activeIncidents: [],
      operationProgress: null,
      npcEmotional: [],
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
      setDefinitions: [],
      sceneImages: {},
      sceneImageRemaining: 100,
      sceneImageLoading: {},
      campaignId: null,
    });
  },
}));
