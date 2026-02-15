"use client";

import { useGameStore } from "@/store/game-store";

export function RunEndScreen() {
  const reset = useGameStore((s) => s.reset);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 bg-[var(--bg-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-px w-40 bg-[var(--gold)]/40" />
        <h1 className="font-display text-3xl tracking-[6px] text-[var(--gold)]">
          여정 완료
        </h1>
        <div className="h-px w-40 bg-[var(--gold)]/40" />
      </div>

      <p className="max-w-md text-center text-sm leading-relaxed text-[var(--text-secondary)]">
        그레이마르 항만의 이야기가 끝났다. 당신의 선택이
        항구 도시와 그 사람들의 운명을 결정지었다.
      </p>

      <button
        onClick={reset}
        className="flex h-12 w-52 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-sm tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]"
      >
        새 게임
      </button>
    </div>
  );
}
