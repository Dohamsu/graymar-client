"use client";

import { useGameStore } from "@/store/game-store";

const NODE_TYPE_LABELS: Record<string, string> = {
  COMBAT: "전투 돌입",
  EVENT: "새로운 사건",
  REST: "휴식처",
  SHOP: "상점",
  EXIT: "여정의 끝",
};

const NODE_TYPE_DESCRIPTIONS: Record<string, string> = {
  COMBAT: "전투를 준비하라...",
  EVENT: "새로운 상황이 펼쳐진다...",
  REST: "잠시 숨을 돌릴 수 있다...",
  SHOP: "물품을 거래할 수 있다...",
  EXIT: "끝이 가까워지고 있다...",
};

export function NodeTransitionScreen() {
  const currentNodeType = useGameStore((s) => s.currentNodeType);
  const currentNodeIndex = useGameStore((s) => s.currentNodeIndex);

  const label = NODE_TYPE_LABELS[currentNodeType ?? ""] ?? "다음 구역";
  const desc = NODE_TYPE_DESCRIPTIONS[currentNodeType ?? ""] ?? "이동 중...";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[var(--bg-primary)]/95 backdrop-blur-sm">
      <div className="h-px w-32 bg-[var(--gold)]/40" />
      <p className="text-xs tracking-[4px] text-[var(--text-muted)]">
        구역 {currentNodeIndex}
      </p>
      <h2 className="font-display text-2xl tracking-[4px] text-[var(--gold)]">
        {label}
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
      <div className="h-px w-32 bg-[var(--gold)]/40" />

      {/* Animated dots */}
      <div className="flex gap-2 pt-4">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]" />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]"
          style={{ animationDelay: "0.3s" }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]"
          style={{ animationDelay: "0.6s" }}
        />
      </div>
    </div>
  );
}
