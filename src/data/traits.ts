export interface TraitDefinition {
  traitId: string;
  name: string;
  icon: string;
  description: string;
  effectSummary: string;
}

export const TRAITS: TraitDefinition[] = [
  {
    traitId: "BATTLE_MEMORY",
    name: "전장의 기억",
    icon: "sword",
    description: "오래된 상처가 기억을 되살린다.",
    effectSummary: "FIGHT/THREATEN +1, MaxHP +10",
  },
  {
    traitId: "STREET_SENSE",
    name: "거리의 촉",
    icon: "eye",
    description: "뒷골목에서 배운 감각.",
    effectSummary: "SNEAK/STEAL/OBSERVE +1, 시작 골드 +20",
  },
  {
    traitId: "SILVER_TONGUE",
    name: "타고난 언변",
    icon: "message-circle",
    description: "말 한마디로 적을 친구로 만든다.",
    effectSummary: "PERSUADE/BRIBE +1, 모든 NPC trust +5",
  },
  {
    traitId: "GAMBLER_LUCK",
    name: "도박꾼의 운",
    icon: "dice-5",
    description: "질 때까지는 이기고 있다.",
    effectSummary: "FAIL -> 50% PARTIAL 승격, 크리티컬 없음, 골드 +30",
  },
  {
    traitId: "BLOOD_OATH",
    name: "피의 맹세",
    icon: "droplets",
    description: "고통이 힘이 된다. 피를 흘릴수록 강해진다.",
    effectSummary: "HP 50%↓ 판정+2, HP 25%↓ 판정+3, MaxHP -20, 치료 50%↓",
  },
  {
    traitId: "NIGHT_CHILD",
    name: "밤의 아이",
    icon: "moon",
    description: "어둠이 내려앉으면 세상이 달라 보인다.",
    effectSummary: "밤/황혼 판정+2, 낮/새벽 판정-1, SNEAK 항상+1",
  },
];
