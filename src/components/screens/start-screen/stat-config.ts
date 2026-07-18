// [arch/77 P5a] StartScreen 스탯·특성 설정 정본 — StartScreen.tsx에서 분리.
import { STAT_COLORS } from "@/data/stat-descriptions";
import {
  Sword,
  Eye,
  MessageCircle,
  Dice5,
  Droplets,
  Moon,
} from "lucide-react";

export const TRAIT_ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  sword: Sword,
  eye: Eye,
  "message-circle": MessageCircle,
  "dice-5": Dice5,
  droplets: Droplets,
  moon: Moon,
};

export const STAT_LABELS: Record<string, string> = {
  MaxHP: "체력",
  str: "힘",
  dex: "민첩",
  wit: "재치",
  con: "체질",
  per: "통찰",
  cha: "카리스마",
};

export const STAT_HINTS: Record<string, string> = {
  str: "전투 . 협박",
  dex: "잠입 . 절도 . 회피",
  wit: "조사 . 수색",
  con: "방어 . 저항 . 도움",
  per: "관찰 . 발견",
  cha: "설득 . 뇌물 . 거래",
};




// Stat descriptions for Step 4
export const STAT_DESCRIPTIONS: Record<string, string> = {
  str: "전투와 위압 판정, 전투 공격력에 영향",
  dex: "은밀과 손재주 판정, 전투 회피/명중에 영향",
  wit: "조사와 분석 판정, 단서 발견에 직결",
  con: "인내와 봉사 판정, 전투 방어력에 영향",
  per: "관찰과 직감 판정, 숨겨진 상황 감지",
  cha: "설득과 거래 판정, NPC 정보 획득에 핵심",
};

/* 스탯 색 정본은 data/stat-descriptions.ts STAT_COLORS — 소문자 키 별칭 */
export const STAT_COLORS_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STAT_COLORS).map(([k, v]) => [k.toLowerCase(), v]),
);

export const BONUS_POINTS_TOTAL = 6;
export const STAT_KEYS = ["str", "dex", "wit", "con", "per", "cha"] as const;

export function nextBonusStats(
  current: Record<string, number>,
  statKey: string,
  delta: 1 | -1,
  remainingPoints: number,
): Record<string, number> {
  const currentValue = current[statKey] ?? 0;
  if (delta > 0 && remainingPoints <= 0) return current;
  if (delta < 0 && currentValue <= 0) return current;
  return { ...current, [statKey]: currentValue + delta };
}

