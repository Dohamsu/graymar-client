"use client";

import { useGameStore } from "@/store/game-store";
import type { EndingResult } from "@/types/game";

const POSTURE_LABELS: Record<string, string> = {
  FRIENDLY: "우호적",
  CAUTIOUS: "경계",
  HOSTILE: "적대적",
  FEARFUL: "두려움",
  CALCULATING: "계산적",
};

const STABILITY_LABELS: Record<string, { text: string; color: string }> = {
  STABLE: { text: "안정", color: "text-green-400" },
  UNSTABLE: { text: "불안정", color: "text-yellow-400" },
  COLLAPSED: { text: "붕괴", color: "text-red-400" },
};

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-mono text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

export function EndingScreen() {
  const endingResult = useGameStore((s) => s.endingResult);
  const reset = useGameStore((s) => s.reset);

  if (!endingResult) {
    // endingResult가 없으면 기존 RunEndScreen 스타일
    return (
      <div className="flex h-full flex-col items-center justify-center gap-10 bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-40 bg-[var(--gold)]/40" />
          <h1 className="font-display text-3xl tracking-[6px] text-[var(--gold)]">
            여정 완료
          </h1>
          <div className="h-px w-40 bg-[var(--gold)]/40" />
        </div>
        <button
          onClick={reset}
          className="flex h-12 w-52 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-sm tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]"
        >
          새 게임
        </button>
      </div>
    );
  }

  const stabilityInfo = STABILITY_LABELS[endingResult.cityStatus.stability] ?? {
    text: "???",
    color: "text-zinc-400",
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="h-px w-40 bg-[var(--gold)]/40" />
        <h1 className="font-display text-3xl tracking-[6px] text-[var(--gold)]">
          여정의 끝
        </h1>
        <div className="h-px w-40 bg-[var(--gold)]/40" />
      </div>

      <div className="mx-auto w-full max-w-lg px-6 pb-12 flex flex-col gap-8">
        {/* Closing Line */}
        <p className="text-center text-sm leading-relaxed text-[var(--text-secondary)] italic">
          {endingResult.closingLine}
        </p>

        {/* City Status */}
        <div className="border border-[var(--border-primary)] rounded-lg p-4 bg-[var(--bg-card)]">
          <h3 className="text-xs font-semibold tracking-[2px] text-[var(--text-muted)] mb-3">
            도시 상태
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">
              {endingResult.cityStatus.summary}
            </span>
            <span className={`text-xs font-semibold ${stabilityInfo.color}`}>
              {stabilityInfo.text}
            </span>
          </div>
        </div>

        {/* NPC Epilogues */}
        {endingResult.npcEpilogues.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-[2px] text-[var(--text-muted)] mb-3">
              인물 에필로그
            </h3>
            <div className="flex flex-col gap-3">
              {endingResult.npcEpilogues.map((npc) => (
                <div
                  key={npc.npcId}
                  className="border border-[var(--border-primary)] rounded-lg p-3 bg-[var(--bg-card)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {npc.npcName}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {POSTURE_LABELS[npc.finalPosture] ?? npc.finalPosture}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    {npc.epilogueText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Narrative Marks */}
        {endingResult.narrativeMarks.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-[2px] text-[var(--text-muted)] mb-3">
              서사 표식
            </h3>
            <div className="flex flex-wrap gap-2">
              {endingResult.narrativeMarks.map((mark, idx) => (
                <div
                  key={idx}
                  className="border border-amber-700/50 rounded-md px-3 py-1.5 bg-amber-900/20"
                >
                  <span className="text-xs font-semibold text-amber-300">
                    {mark.type}
                  </span>
                  <p className="text-[10px] text-amber-200/70 mt-0.5">
                    {mark.context}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="border border-[var(--border-primary)] rounded-lg p-4 bg-[var(--bg-card)]">
          <h3 className="text-xs font-semibold tracking-[2px] text-[var(--text-muted)] mb-3">
            통계
          </h3>
          <div className="flex flex-col gap-1.5">
            <StatRow label="경과 일수" value={endingResult.statistics.daysSpent} />
            <StatRow label="총 턴수" value={endingResult.statistics.totalTurns} />
            <StatRow label="해결된 사건" value={endingResult.statistics.incidentsContained} />
            <StatRow label="악화된 사건" value={endingResult.statistics.incidentsEscalated} />
            <StatRow label="만료된 사건" value={endingResult.statistics.incidentsExpired} />
          </div>
        </div>

        {/* New Game Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={reset}
            className="flex h-12 w-52 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-sm tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]"
          >
            새 게임
          </button>
        </div>
      </div>
    </div>
  );
}
