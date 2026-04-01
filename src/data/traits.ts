export interface TraitDefinition {
  traitId: string;
  name: string;
  icon: string;
  description: string;
  effectSummary: string;
  effectDetails: string[];
}

export const TRAITS: TraitDefinition[] = [
  {
    traitId: "BATTLE_MEMORY",
    name: "전장의 기억",
    icon: "sword",
    description: "오래된 상처가 기억을 되살린다. 위기 앞에서 몸이 먼저 반응한다.",
    effectSummary: "전투·위압 주사위 +1, 최대 체력 +10",
    effectDetails: [
      "🎲 전투와 위협 행동 시 주사위 굴림에 +1 보너스",
      "❤️ 최대 체력이 10 증가합니다",
    ],
  },
  {
    traitId: "STREET_SENSE",
    name: "거리의 촉",
    icon: "eye",
    description: "뒷골목에서 배운 감각. 위험과 기회를 코로 맡는다.",
    effectSummary: "잠입·절도·관찰 주사위 +1, 시작 골드 +20",
    effectDetails: [
      "🎲 잠입, 절도, 관찰 행동 시 주사위 굴림에 +1 보너스",
      "💰 시작 시 골드 20을 추가로 받습니다",
    ],
  },
  {
    traitId: "SILVER_TONGUE",
    name: "타고난 언변",
    icon: "message-circle",
    description: "말 한마디로 적을 친구로, 친구를 도구로 만든다.",
    effectSummary: "설득·매수 주사위 +1, 모든 NPC 호감도 +5",
    effectDetails: [
      "🎲 설득과 매수 행동 시 주사위 굴림에 +1 보너스",
      "🤝 게임 시작 시 모든 NPC의 호감도가 5 높은 상태로 시작합니다",
    ],
  },
  {
    traitId: "GAMBLER_LUCK",
    name: "도박꾼의 운",
    icon: "dice-5",
    description: "질 때까지는 이기고 있다. 최악의 결과를 피하지만, 최고의 순간도 없다.",
    effectSummary: "실패 → 50% 확률로 부분 성공, 치명타 불가, 골드 +30",
    effectDetails: [
      "🎲 주사위 결과가 실패일 때, 50% 확률로 부분 성공으로 바뀝니다",
      "⚠️ 대신 전투에서 치명타가 발동하지 않습니다",
      "💰 시작 시 골드 30을 추가로 받습니다",
    ],
  },
  {
    traitId: "BLOOD_OATH",
    name: "피의 맹세",
    icon: "droplets",
    description: "고통이 힘이 된다. 피를 흘릴수록 강해진다.",
    effectSummary: "체력 절반 이하 시 주사위 +2, 4분의 1 이하 시 +3",
    effectDetails: [
      "🎲 체력이 절반 이하로 떨어지면 모든 주사위 굴림에 +2 보너스",
      "🎲 체력이 4분의 1 이하면 추가로 +1 (총 +3)",
      "⚠️ 최대 체력이 20 감소합니다",
      "⚠️ 치료 아이템의 효과가 절반으로 줄어듭니다",
    ],
  },
  {
    traitId: "NIGHT_CHILD",
    name: "밤의 아이",
    icon: "moon",
    description: "어둠이 내려앉으면 세상이 달라 보인다.",
    effectSummary: "밤·황혼 주사위 +2, 낮·새벽 주사위 -1, 잠입 항상 +1",
    effectDetails: [
      "🎲 밤이나 황혼에는 모든 주사위 굴림에 +2 보너스",
      "⚠️ 낮이나 새벽에는 모든 주사위 굴림에 -1 페널티",
      "🎲 잠입 행동은 시간대와 관계없이 항상 +1 보너스",
    ],
  },
];
