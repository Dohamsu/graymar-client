export interface StoryMessage {
  id: string;
  type: "SYSTEM" | "NARRATOR" | "PLAYER" | "CHOICE";
  text: string;
  choices?: Choice[];
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

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  color: string;
};
