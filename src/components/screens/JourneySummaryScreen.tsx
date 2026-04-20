"use client";

import { useGameStore } from "@/store/game-store";
import type {
  EndingSummary,
  EndingSummaryStability,
  JourneyKeyEvent,
  JourneyKeyNpc,
} from "@/types/game";

const STABILITY_LABELS: Record<EndingSummaryStability, { text: string; color: string; border: string; bg: string }> = {
  STABLE: {
    text: "안정",
    color: "text-[var(--success-green)]",
    border: "border-[var(--success-green)]/50",
    bg: "bg-[var(--success-green)]/10",
  },
  UNSTABLE: {
    text: "불안정",
    color: "text-[var(--gold)]",
    border: "border-[var(--gold)]/50",
    bg: "bg-[var(--gold)]/10",
  },
  COLLAPSED: {
    text: "붕괴",
    color: "text-[var(--hp-red)]",
    border: "border-[var(--hp-red)]/50",
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

function eventDotColor(ev: JourneyKeyEvent): string {
  if (ev.kind === "MARK") return "bg-[var(--gold)]";
  if (ev.kind === "DISCOVERY") return "bg-[var(--info-blue,#60a5fa)]";
  // INCIDENT — outcome 기반
  switch (ev.outcome) {
    case "CONTAINED":
      return "bg-[var(--success-green)]";
    case "ESCALATED":
      return "bg-[var(--hp-red)]";
    case "EXPIRED":
      return "bg-[var(--text-muted)]";
    default:
      return "bg-[var(--text-muted)]";
  }
}

function bondLabelStyle(label: string): string {
  const lower = label.toLowerCase();
  if (
    lower.includes("적") ||
    lower.includes("원수") ||
    lower.includes("배신")
  ) {
    return "border-[var(--hp-red)]/40 bg-[var(--hp-red)]/10 text-[var(--hp-red)]";
  }
  if (lower.includes("벗") || lower.includes("친구") || lower.includes("동료")) {
    return "border-[var(--success-green)]/40 bg-[var(--success-green)]/10 text-[var(--success-green)]";
  }
  if (lower.includes("유대") || lower.includes("존경") || lower.includes("스승")) {
    return "border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]";
  }
  return "border-[var(--text-muted)]/40 bg-[var(--bg-card)] text-[var(--text-secondary)]";
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--gold)]/20" />
        <h2 className="font-display text-[11px] tracking-[4px] text-[var(--gold)]/80 uppercase">
          {label}
        </h2>
        <div className="h-px flex-1 bg-[var(--gold)]/20" />
      </div>
      {children}
    </section>
  );
}

function JourneyEventRow({ ev }: { ev: JourneyKeyEvent }) {
  return (
    <li className="relative flex gap-3 pl-1">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventDotColor(ev)}`}
        aria-hidden
      />
      <div className="flex-1">
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">
          {typeof ev.day === "number" && (
            <span className="mr-2 text-xs font-semibold text-[var(--gold)]/80">
              Day {ev.day}
            </span>
          )}
          <span>{ev.text}</span>
        </p>
      </div>
    </li>
  );
}

function JourneyNpcRow({ npc }: { npc: JourneyKeyNpc }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-[var(--border-primary)] bg-[var(--bg-card)]/60 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {npc.npcName}
        </span>
        {npc.bondLabel && (
          <span
            className={`rounded-sm border px-2 py-0.5 text-[10px] tracking-[1px] ${bondLabelStyle(npc.bondLabel)}`}
          >
            {npc.bondLabel}
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        {npc.oneLine}
      </p>
    </div>
  );
}

function SummaryContent({ summary }: { summary: EndingSummary }) {
  const reset = useGameStore((s) => s.reset);
  const stab = STABILITY_LABELS[summary.finale.stability] ?? STABILITY_LABELS.UNSTABLE;

  const handleBack = () => {
    useGameStore.setState({ phase: "ENDINGS_LIST", activeSummary: null });
  };

  const handleNewGame = () => {
    reset();
  };

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-8 pb-16 sm:px-6">
      {/* ① 헤더 */}
      <header className="relative mb-10 flex flex-col items-center gap-3 border-y border-[var(--gold)]/30 py-8">
        <span className="text-[10px] tracking-[5px] text-[var(--gold)]/70 uppercase">
          여정의 기록
        </span>
        <h1 className="text-center font-display text-2xl leading-tight text-[var(--text-primary)] sm:text-3xl">
          <span className="text-[var(--gold)]">{summary.presetLabel}</span>{" "}
          {summary.characterName}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {summary.stats.daysSpent}일의 여정
          <span className="mx-2">·</span>
          {formatDate(summary.completedAt)}
        </p>
      </header>

      {/* ② 줄거리 */}
      <div className="mb-12">
        <Section label="줄거리">
          <p className="text-sm italic leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {summary.synopsis}
          </p>
        </Section>
      </div>

      {/* ③ 핵심 사건 */}
      {summary.keyEvents.length > 0 && (
        <div className="mb-12">
          <Section label="핵심 사건">
            <ul className="flex flex-col gap-3">
              {summary.keyEvents.map((ev, i) => (
                <JourneyEventRow key={i} ev={ev} />
              ))}
            </ul>
          </Section>
        </div>
      )}

      {/* ④ 남은 인연 */}
      {summary.keyNpcs.length > 0 && (
        <div className="mb-12">
          <Section label="남은 인연">
            <div className="flex flex-col gap-3">
              {summary.keyNpcs.map((npc) => (
                <JourneyNpcRow key={npc.npcId} npc={npc} />
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ⑤ 결말 */}
      <div className="mb-12">
        <Section label="결말">
          <div className="flex flex-col items-center gap-4 py-2">
            <span
              className={`rounded-sm border px-3 py-1 text-xs font-semibold tracking-[3px] ${stab.border} ${stab.bg} ${stab.color}`}
            >
              {stab.text}
            </span>
            <h3 className="text-center font-display text-xl tracking-[2px] text-[var(--gold)]">
              {summary.finale.arcTitle}
            </h3>
            <p className="text-center text-sm italic leading-relaxed text-[var(--text-primary)] sm:text-base">
              {summary.finale.closingLine}
            </p>
            {summary.finale.playstyleSummary && (
              <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                당신은{" "}
                <span className="text-[var(--gold)]">
                  {summary.finale.playstyleSummary}
                </span>
                이었다.
              </p>
            )}
          </div>
        </Section>
      </div>

      {/* ⑥ 통계 */}
      <div className="mb-10 flex justify-center">
        <p className="text-center text-[11px] tracking-[1px] text-[var(--text-muted)]">
          {summary.stats.daysSpent}일
          <span className="mx-1.5 opacity-50">·</span>
          {summary.stats.totalTurns}턴
          <span className="mx-1.5 opacity-50">·</span>
          해결 {summary.stats.incidentsContained}
          <span className="mx-1.5 opacity-50">/</span>
          악화 {summary.stats.incidentsEscalated}
          <span className="mx-1.5 opacity-50">/</span>
          만료 {summary.stats.incidentsExpired}
        </p>
      </div>

      {/* ⑦ 하단 액션 바 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-11 flex-1 items-center justify-center border border-[var(--border-primary)] bg-transparent font-display text-xs tracking-[3px] text-[var(--text-secondary)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)] sm:flex-none sm:min-w-[140px]"
        >
          목록으로
        </button>
        <button
          type="button"
          onClick={handleNewGame}
          className="flex h-11 flex-1 items-center justify-center border border-[var(--gold)] bg-transparent font-display text-xs tracking-[3px] text-[var(--gold)] transition-all hover:bg-[var(--gold)] hover:text-[var(--bg-primary)] sm:flex-none sm:min-w-[140px]"
        >
          새 게임
        </button>
      </div>
    </div>
  );
}

export function JourneySummaryScreen() {
  const summary = useGameStore((s) => s.activeSummary);
  const loading = useGameStore((s) => s.summaryLoading);
  const error = useGameStore((s) => s.summaryError);

  const handleBack = () => {
    useGameStore.setState({ phase: "ENDINGS_LIST", activeSummary: null });
  };

  if (loading || (!summary && !error)) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center">
        <p className="text-sm text-[var(--hp-red)]">
          {error ?? "여정을 불러올 수 없습니다."}
        </p>
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 items-center justify-center border border-[var(--border-primary)] px-5 text-xs tracking-[2px] text-[var(--text-secondary)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold)]"
        >
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--bg-primary)]">
      <SummaryContent summary={summary} />
    </div>
  );
}
