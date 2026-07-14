export interface TraitDefinition {
  traitId: string;
  name: string;
  icon: string;
  description: string;
  effectSummary: string;
  effectDetails: string[];
}

/** 서버 creation-bundle의 팩 특성 원형 (architecture/71 §4.2) */
export interface PackTrait {
  traitId: string;
  name: string;
  icon: string;
  description: string;
  effects: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  FIGHT: "전투",
  THREATEN: "위협",
  SNEAK: "잠입",
  STEAL: "절도",
  OBSERVE: "관찰",
  INVESTIGATE: "조사",
  SEARCH: "수색",
  PERSUADE: "설득",
  BRIBE: "매수",
  TALK: "대화",
  TRADE: "거래",
  HELP: "조력",
};

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

/**
 * 팩 특성(effects) → 표시용 TraitDefinition 변환 (architecture/71 §4.3).
 * graymar 특성은 큐레이션된 TRAITS 사본을 우선 사용하고,
 * 다른 팩 특성은 effects에서 요약/상세 문구를 파생한다.
 */
export function formatPackTrait(t: PackTrait): TraitDefinition {
  const curated = TRAITS.find((x) => x.traitId === t.traitId);
  if (curated) return curated;

  const eff = t.effects ?? {};
  const details: string[] = [];
  const summaryParts: string[] = [];
  const num = (v: unknown): number | null =>
    typeof v === "number" && v !== 0 ? v : null;

  const ab = eff.actionBonuses as Record<string, number> | undefined;
  if (ab && Object.keys(ab).length > 0) {
    const parts = Object.entries(ab).map(
      ([k, v]) => `${ACTION_LABELS[k] ?? k} ${v > 0 ? "+" : ""}${v}`,
    );
    details.push(`🎲 ${parts.join(", ")} 주사위 보정`);
    summaryParts.push(`${parts.join("·")} 주사위`);
  }
  const maxHpBonus = num(eff.maxHpBonus);
  if (maxHpBonus) {
    details.push(`❤️ 최대 체력 +${maxHpBonus}`);
    summaryParts.push(`최대 체력 +${maxHpBonus}`);
  }
  const maxHpPenalty = num(eff.maxHpPenalty);
  if (maxHpPenalty) {
    details.push(`💔 최대 체력 ${maxHpPenalty}`);
    summaryParts.push(`최대 체력 ${maxHpPenalty}`);
  }
  const goldBonus = num(eff.goldBonus);
  if (goldBonus) {
    details.push(`💰 시작 골드 +${goldBonus}`);
    summaryParts.push(`시작 골드 +${goldBonus}`);
  }
  const trust = num(eff.globalTrustBonus);
  if (trust) {
    details.push(`🤝 모든 NPC 호감도 +${trust}`);
    summaryParts.push(`NPC 호감도 +${trust}`);
  }
  const ftp = num(eff.failToPartialChance);
  if (ftp) {
    const pct = ftp > 1 ? ftp : Math.round(ftp * 100);
    details.push(`🎲 실패의 ${pct}%가 부분 성공으로 전환`);
  }
  if (eff.criticalDisabled) details.push("⚠️ 크리티컬이 발동하지 않습니다");
  if (eff.lowHpBonus) details.push("🔥 체력이 낮을수록 판정 보너스");
  const heal = num(eff.healingReduction);
  if (heal) {
    const pct = heal > 1 ? heal : Math.round(heal * 100);
    details.push(`💔 치료 효과 ${pct}% 감소`);
  }
  const night = num(eff.nightBonus);
  if (night) details.push(`🌙 밤 판정 +${night}`);
  const day = num(eff.dayPenalty);
  if (day) details.push(`☀️ 낮 판정 ${day}`);

  return {
    traitId: t.traitId,
    name: t.name,
    icon: t.icon,
    description: t.description,
    effectSummary: summaryParts.slice(0, 2).join(", ") || "특수 효과",
    effectDetails: details.length > 0 ? details : ["특수 효과"],
  };
}
