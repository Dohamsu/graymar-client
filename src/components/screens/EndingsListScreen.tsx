"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import type { EndingSummaryCard, EndingSummaryStability } from "@/types/game";

const STABILITY_LABELS: Record<EndingSummaryStability, { text: string; color: string; border: string; bg: string }> = {
  STABLE: {
    text: "안정",
    color: "text-[var(--success-green)]",
    border: "border-[var(--success-green)]/40",
    bg: "bg-[var(--success-green)]/10",
  },
  UNSTABLE: {
    text: "불안정",
    color: "text-[var(--gold)]",
    border: "border-[var(--gold)]/40",
    bg: "bg-[var(--gold)]/10",
  },
  COLLAPSED: {
    text: "붕괴",
    color: "text-[var(--hp-red)]",
    border: "border-[var(--hp-red)]/40",
    bg: "bg-[var(--hp-red)]/10",
  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function EndingCard({
  card,
  onClick,
}: {
  card: EndingSummaryCard;
  onClick: () => void;
}) {
  const stab = STABILITY_LABELS[card.stability] ?? STABILITY_LABELS.UNSTABLE;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 text-left transition-all hover:border-[var(--gold)] hover:shadow-[0_0_12px_rgba(201,169,98,0.15)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-semibold leading-tight text-[var(--gold)] group-hover:text-[var(--gold)]">
          {card.arcTitle || "이름 없는 여정"}
        </h3>
        <span
          className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[1px] ${stab.border} ${stab.bg} ${stab.color}`}
        >
          {stab.text}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-[var(--text-primary)]">
          {card.characterName}
          <span className="mx-2 text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-secondary)]">{card.presetLabel}</span>
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {card.daysSpent}일 · {card.totalTurns}턴
          <span className="mx-2">·</span>
          {formatDate(card.completedAt)}
        </p>
      </div>
    </button>
  );
}

export function EndingsListScreen() {
  const endings = useGameStore((s) => s.archivedEndings);
  const cursor = useGameStore((s) => s.archiveCursor);
  const total = useGameStore((s) => s.archiveTotal);
  const loading = useGameStore((s) => s.archiveLoading);
  const error = useGameStore((s) => s.archiveError);
  const loadEndings = useGameStore((s) => s.loadEndings);
  const loadSummary = useGameStore((s) => s.loadSummary);

  useEffect(() => {
    // 최초 진입 시 자동 로드 (StartScreen에서 이미 호출되지만 안전장치)
    if (endings.length === 0 && !loading && !error) {
      void loadEndings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardClick = (runId: string) => {
    void loadSummary(runId);
    useGameStore.setState({ phase: "ENDINGS_DETAIL" });
  };

  const handleBack = () => {
    useGameStore.setState({ phase: "TITLE" });
  };

  const handleLoadMore = () => {
    if (!cursor || loading) return;
    void loadEndings(true);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] overflow-y-auto">
      <div className="mx-auto w-full max-w-[760px] px-4 pt-10 pb-16 sm:px-6">
        {/* 상단 돌아가기 */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--gold)]"
          >
            &larr; 돌아가기
          </button>
        </div>

        {/* 헤더 */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="h-px w-40 bg-[var(--gold)]/40" />
          <h1 className="font-display text-2xl tracking-[6px] text-[var(--gold)] sm:text-3xl">
            지난 여정들
          </h1>
          <div className="h-px w-40 bg-[var(--gold)]/40" />
          {total > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              총 {total}개의 여정
            </p>
          )}
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-4 rounded border border-[var(--hp-red)]/40 bg-[var(--hp-red)]/10 p-3 text-sm text-[var(--hp-red)]">
            {error}
          </div>
        )}

        {/* 로딩 (초기) */}
        {loading && endings.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && endings.length === 0 && !error && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-[var(--text-muted)]">
              아직 완결된 여정이 없습니다.
            </p>
          </div>
        )}

        {/* 카드 그리드 */}
        {endings.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {endings.map((card) => (
              <EndingCard
                key={card.runId}
                card={card}
                onClick={() => handleCardClick(card.runId)}
              />
            ))}
          </div>
        )}

        {/* 더 불러오기 */}
        {cursor && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loading}
              className="flex h-11 items-center justify-center border border-[var(--gold)]/60 bg-transparent px-6 font-display text-xs tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)] disabled:opacity-50"
            >
              {loading ? "불러오는 중..." : "더 불러오기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
