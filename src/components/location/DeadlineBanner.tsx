"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useGameStore } from "@/store/game-store";

/**
 * 게임 상단 고정 배너 — 소프트 데드라인 임박/초과 시에만 표시.
 * 조건 미충족이면 렌더링 안 함 (null 반환).
 *
 * 단계:
 *  triggered 또는 daysLeft < 0 → 빨강, "시한 초과"
 *  daysLeft ≤ 2 → 빨강/옅음, "D-N · 긴박"
 *  daysLeft === 3 → 주황, "D-3 · 결말 가까움"
 *  daysLeft ≥ 4 → 렌더 안 함
 */
export function DeadlineBanner() {
  const mainArcClock = useGameStore((s) => s.mainArcClock);
  const day = useGameStore((s) => s.day);

  if (!mainArcClock) return null;
  const daysLeft = mainArcClock.softDeadlineDay - day;
  const isExceeded = mainArcClock.triggered || daysLeft < 0;
  const isUrgent = !isExceeded && daysLeft <= 2;
  const isNear = !isExceeded && !isUrgent && daysLeft === 3;

  if (!isExceeded && !isUrgent && !isNear) return null;

  const tone = isExceeded
    ? {
        bg: "bg-[var(--hp-red)]/15",
        border: "border-[var(--hp-red)]/60",
        text: "text-[var(--hp-red)]",
        icon: AlertTriangle,
        label: "시한 초과",
        body: "그레이마르의 시간이 다 됐다. 도시는 이미 변하기 시작했다.",
      }
    : isUrgent
      ? {
          bg: "bg-[var(--hp-red)]/10",
          border: "border-[var(--hp-red)]/40",
          text: "text-[var(--hp-red)]",
          icon: AlertTriangle,
          label: `D-${daysLeft}`,
          body:
            daysLeft === 0
              ? "오늘이 결말의 문턱이다."
              : `마지막 종이 울리기까지 ${daysLeft}일 남았다.`,
        }
      : {
          bg: "bg-[#f97316]/10",
          border: "border-[#f97316]/40",
          text: "text-[#f97316]",
          icon: Clock,
          label: "D-3",
          body: "도시의 공기가 무거워지고 있다.",
        };

  const Icon = tone.icon;

  return (
    <div
      className={`flex shrink-0 items-center gap-2 border-b ${tone.border} ${tone.bg} px-4 py-1.5 lg:py-2`}
      role="status"
      aria-live="polite"
    >
      <Icon size={14} className={`shrink-0 ${tone.text}`} />
      <span className={`font-display text-[11px] tracking-[2px] ${tone.text}`}>
        {tone.label}
      </span>
      <span className="truncate text-[11px] text-[var(--text-secondary)]">
        {tone.body}
      </span>
    </div>
  );
}
