import type { CharacterPreset } from "@/types/game";

export const PRESETS: CharacterPreset[] = [
  {
    presetId: "DOCKWORKER",
    name: "부두 노동자",
    subtitle: "항만의 주먹",
    description:
      "그레이마르 항만에서 10년간 화물을 나른 노동자. 길드 간부의 횡령을 목격한 뒤 쫓겨났다.",
    playstyleHint: "높은 체력과 힘. 맞으면서 싸우는 근접 탱커.",
    portraits: { male: "/dockworker_m.png", female: "/dockworker_f.png" },
    stats: {
      MaxHP: 120,
      MaxStamina: 5,
      str: 14,
      dex: 5,
      wit: 5,
      con: 13,
      per: 6,
      cha: 6,
    },
    startingGold: 30,
    startingItems: [{ name: "하급 치료제", qty: 2 }],
  },
  {
    presetId: "DESERTER",
    name: "탈영병",
    subtitle: "추적받는 검",
    description:
      "왕국 남부 수비대 출신. 상관의 민간인 약탈 명령에 항명하여 탈영했다. 현재 수배 중.",
    playstyleHint: "균형 잡힌 스탯. 정석적인 전투와 탐험.",
    portraits: { male: "/deserter_m.png", female: "/deserter_f.png" },
    stats: {
      MaxHP: 100,
      MaxStamina: 5,
      str: 14,
      dex: 8,
      wit: 8,
      con: 10,
      per: 7,
      cha: 6,
    },
    startingGold: 45,
    startingItems: [
      { name: "하급 치료제", qty: 1 },
      { name: "체력 강장제", qty: 1 },
    ],
  },
  {
    presetId: "SMUGGLER",
    name: "밀수업자",
    subtitle: "어둠의 운반책",
    description:
      "밀수 조직 '검은 조류'의 하급 운반책이었다. 조직 와해 후 제거 대상이 되었다.",
    playstyleHint: "높은 민첩과 카리스마. 은밀한 행동과 사회적 상황에 강하다.",
    portraits: { male: "/smuggler_m.png", female: "/smuggler_f.png" },
    stats: {
      MaxHP: 85,
      MaxStamina: 6,
      str: 11,
      dex: 12,
      wit: 6,
      con: 7,
      per: 8,
      cha: 10,
    },
    startingGold: 60,
    startingItems: [
      { name: "하급 치료제", qty: 1 },
      { name: "잠금해제 도구", qty: 1 },
    ],
  },
  {
    presetId: "HERBALIST",
    name: "약초상",
    subtitle: "뒷골목 약사",
    description:
      "항만 뒷골목에서 합법 약재와 밀수 독초를 함께 취급하는 약사. 세 세력 모두와 거래해왔다.",
    playstyleHint: "높은 재치와 통찰. 조사와 관찰에 특화된 지원형.",
    portraits: { male: "/herbalist_m.png", female: "/herbalist_f.png" },
    stats: {
      MaxHP: 90,
      MaxStamina: 7,
      str: 8,
      dex: 7,
      wit: 10,
      con: 10,
      per: 10,
      cha: 6,
    },
    startingGold: 40,
    startingItems: [
      { name: "하급 치료제", qty: 2 },
      { name: "독침", qty: 2 },
      { name: "체력 강장제", qty: 1 },
    ],
  },
];
