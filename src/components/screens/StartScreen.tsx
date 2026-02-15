"use client";

import { useGameStore } from "@/store/game-store";

export function StartScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const phase = useGameStore((s) => s.phase);
  const isLoading = phase === "LOADING";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 bg-[var(--bg-primary)]">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center border-2 border-[var(--gold)]">
          <span className="font-display text-3xl font-bold text-[var(--gold)]">
            R
          </span>
        </div>
        <h1 className="font-display text-4xl tracking-[6px] text-[var(--text-primary)]">
          그림자의 왕국
        </h1>
        <p className="text-base text-[var(--text-muted)]">
          그레이마르 항만 — 버티컬 슬라이스
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={startNewGame}
          disabled={isLoading}
          className="flex h-14 w-64 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-lg tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)] disabled:opacity-50"
        >
          {isLoading ? "불러오는 중..." : "새 게임"}
        </button>
      </div>
    </div>
  );
}
