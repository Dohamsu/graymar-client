export interface StoryMessage {
  id: string;
  type: "SYSTEM" | "NARRATOR" | "PLAYER" | "CHOICE";
  text: string;
  choices?: Choice[];
  loading?: boolean;
  selectedChoiceId?: string;
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

export interface EquipmentItem {
  slot: string;
  name: string;
  rarity?: string;
  icon: string;
  color: string;
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
