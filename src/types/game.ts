export interface StoryMessage {
  id: string;
  type: "SYSTEM" | "NARRATOR" | "PLAYER" | "CHOICE" | "RESOLVE";
  text: string;
  choices?: Choice[];
  loading?: boolean;
  selectedChoiceId?: string;
  resolveOutcome?: ResolveOutcome;
  resolveBreakdown?: ResolveBreakdown;
}

export interface Choice {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface PlayerHud {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  gold: number;
}

export interface CharacterInfo {
  name: string;
  class: string;
  portrait?: string;
  level: number;
  exp: number;
  maxExp: number;
  stats: StatItem[];
  equipment: EquipmentItem[];
}

export interface StatItem {
  label: string;
  value: number;
  color: string;
}

export interface ItemInstance {
  instanceId: string;
  baseItemId: string;
  prefixAffixId?: string;
  suffixAffixId?: string;
  displayName: string;
}

export interface EquipmentItem {
  slot: string;
  name: string; // displayName (affix 포함)
  baseName: string; // 원본 아이템 이름
  rarity?: string;
  icon: string;
  color: string;
  prefixName?: string;
  suffixName?: string;
  statBonus?: Record<string, number>;
}

export interface CharacterPreset {
  presetId: string;
  name: string;
  subtitle: string;
  description: string;
  playstyleHint: string;
  portraits?: { male: string; female: string };
  stats: {
    MaxHP: number;
    MaxStamina: number;
    ATK: number;
    DEF: number;
    ACC: number;
    EVA: number;
    CRIT: number;
    CRIT_DMG: number;
    RESIST: number;
    SPEED: number;
  };
  startingGold: number;
  startingItems: Array<{ name: string; qty: number }>;
}

export interface InventoryItem {
  itemId: string;
  qty: number;
}

export interface InventoryChanges {
  itemsAdded: Array<{ itemId: string; qty: number }>;
  itemsRemoved: Array<{ itemId: string; qty: number }>;
  goldDelta: number;
}

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

// ---------------------------------------------------------------------------
// Server types (frontend mirror)
// ---------------------------------------------------------------------------

export interface BattleEnemy {
  id: string;
  hp: number;
  maxHp?: number;
  name?: string;
  status: Array<{ id: string; stacks: number; duration: number }>;
  personality: string;
  distance: string;
  angle: string;
}

export interface ServerResultV1 {
  version: string;
  turnNo: number;
  node: { id: string; type: string; index: number; state: string };
  summary: { short: string; display?: string };
  events: Array<{
    id: string;
    kind: string;
    text: string;
    tags: string[];
    data?: Record<string, unknown>;
  }>;
  diff: {
    player: {
      hp: { from: number; to: number; delta: number };
      stamina: { from: number; to: number; delta: number };
      status: unknown[];
    };
    enemies: Array<{
      enemyId: string;
      hp: { from: number; to: number; delta: number };
      status: unknown[];
    }>;
    inventory: {
      itemsAdded: Array<{ itemId: string; qty: number }>;
      itemsRemoved: Array<{ itemId: string; qty: number }>;
      goldDelta: number;
    };
    meta: {
      battle: { phase: string };
      position: { env: string[] };
    };
  };
  ui: {
    availableActions: string[];
    targetLabels: Array<{ id: string; name: string; hint: string }>;
    actionSlots: { base: number; bonusAvailable: boolean; max: number };
    toneHint: string;
    worldState?: WorldStateUI;
    resolveOutcome?: 'SUCCESS' | 'PARTIAL' | 'FAIL';
    resolveBreakdown?: ResolveBreakdown;
    // Notification System 확장
    notifications?: GameNotification[];
    pinnedAlerts?: GameNotification[];
    worldDeltaSummary?: WorldDeltaSummaryUI;
  };
  choices: Array<{
    id: string;
    label: string;
    hint?: string;
    action: { type: string; payload: Record<string, unknown> };
  }>;
  flags: {
    bonusSlot: boolean;
    downed: boolean;
    battleEnded: boolean;
    nodeTransition?: boolean;
  };
}

export interface WorldStateUI {
  hubHeat: number;
  hubSafety: 'SAFE' | 'ALERT' | 'DANGER';
  timePhase: 'DAY' | 'NIGHT';
  phaseV2?: 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';
  day?: number;
  currentLocationId: string | null;
}

export type ResolveOutcome = 'SUCCESS' | 'PARTIAL' | 'FAIL';

export interface ResolveBreakdown {
  diceRoll: number;
  statKey: string | null;
  statValue: number;
  statBonus: number;
  baseMod: number;
  totalScore: number;
}

// --- Narrative Engine v1 UI Types ---

export interface IncidentSummaryUI {
  incidentId: string;
  title: string;
  kind: string;
  stage: number;
  control: number;
  pressure: number;
  deadlineClock: number;
  resolved: boolean;
  outcome?: string;
}

export interface SignalFeedItemUI {
  id: string;
  channel: string;
  severity: 1 | 2 | 3 | 4 | 5;
  locationId?: string;
  text: string;
}

export interface NpcEmotionalUI {
  npcId: string;
  npcName: string;
  trust: number;
  fear: number;
  respect: number;
  suspicion: number;
  attachment: number;
  posture: string;
  marks: string[];
}

export interface OperationProgressUI {
  sessionId: string;
  locationId: string;
  currentStep: number;
  maxSteps: number;
  totalTimeCost: number;
  active: boolean;
}

// --- PlayerThread UI ---

export interface PlayerThreadSummaryUI {
  threadId: string;
  approachVector: string;
  goalCategory: string;
  actionCount: number;
  successRate: number;
  status: 'EMERGING' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  summary?: string;
}

// --- Notification System ---

export type NotificationScope = 'TURN_RESULT' | 'LOCATION' | 'HUB' | 'GLOBAL';
export type NotificationKind = 'SYSTEM' | 'INCIDENT' | 'WORLD' | 'NPC' | 'DEADLINE' | 'ACHIEVEMENT';
export type NotificationPriority = 'LOW' | 'MID' | 'HIGH' | 'CRITICAL';
export type NotificationPresentation = 'BANNER' | 'TOAST' | 'FEED_ITEM' | 'PINNED_CARD';

export interface GameNotification {
  id: string;
  turnNo: number;
  tickNo?: number;
  scope: NotificationScope;
  kind: NotificationKind;
  priority: NotificationPriority;
  presentation: NotificationPresentation;
  title: string;
  body: string;
  incidentId?: string;
  locationId?: string;
  pinned?: boolean;
  visibleFromTurn: number;
  expiresAtTurn?: number;
  dedupeKey?: string;
}

export interface WorldDeltaSummaryUI {
  headline: string;
  visibleChanges: string[];
  urgency: 'LOW' | 'MID' | 'HIGH';
}

// --- Ending System ---

export interface NpcEpilogue {
  npcId: string;
  npcName: string;
  epilogueText: string;
  finalPosture: string;
}

export interface CityStatus {
  stability: 'STABLE' | 'UNSTABLE' | 'COLLAPSED';
  summary: string;
}

export interface EndingResult {
  endingType: 'NATURAL' | 'DEADLINE' | 'PLAYER_CHOICE';
  npcEpilogues: NpcEpilogue[];
  cityStatus: CityStatus;
  narrativeMarks: Array<{ type: string; context: string }>;
  closingLine: string;
  statistics: {
    daysSpent: number;
    incidentsContained: number;
    incidentsEscalated: number;
    incidentsExpired: number;
    totalTurns: number;
  };
  // User-Driven System v3 확장
  playstyleSummary?: string;
  dominantVectors?: string[];
  threadSummary?: string;
}

export interface SubmitTurnResponse {
  accepted: boolean;
  turnNo: number;
  serverResult: ServerResultV1;
  llm: { status: string; narrative: string | null };
  meta?: { nodeOutcome: string; policyResult: string };
  transition?: {
    nextNodeIndex: number;
    nextNodeType: string;
    enterResult: ServerResultV1;
    battleState?: unknown;
    enterTurnNo?: number;
  };
}
