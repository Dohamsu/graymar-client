"use client";

import type { SignalFeedItemUI } from "@/types/game";

interface Props {
  signals: SignalFeedItemUI[];
}

const CHANNEL_LABELS: Record<string, string> = {
  RUMOR: "소문",
  SECURITY: "치안",
  NPC_BEHAVIOR: "인물",
  ECONOMY: "경제",
  VISUAL: "목격",
};

const SEVERITY_COLORS: Record<number, string> = {
  1: "text-[var(--text-secondary)]",
  2: "text-[var(--info-blue)]",
  3: "text-[var(--gold)]",
  4: "text-[var(--orange)]",
  5: "text-[var(--hp-red)]",
};

const SEVERITY_BG: Record<number, string> = {
  1: "border-[var(--border-primary)]",
  2: "border-[var(--info-blue)]/40",
  3: "border-[var(--gold)]/40",
  4: "border-[var(--orange)]/40",
  5: "border-[var(--hp-red)]/40 bg-[var(--hp-red)]/5",
};

export function SignalFeedPanel({ signals }: Props) {
  if (signals.length === 0) return null;

  // severity 높은 것 우선, 같으면 최신 우선
  const sorted = [...signals].sort((a, b) => b.severity - a.severity);

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((signal) => (
        <div
          key={signal.id}
          className={`border-l-2 pl-2 py-1 text-xs ${SEVERITY_BG[signal.severity] ?? "border-[var(--border-primary)]"}`}
        >
          <span
            className={`font-mono text-[10px] ${SEVERITY_COLORS[signal.severity] ?? "text-[var(--text-secondary)]"}`}
          >
            [{CHANNEL_LABELS[signal.channel] ?? signal.channel}]
          </span>{" "}
          <span className="text-[var(--text-primary)]">{signal.text}</span>
        </div>
      ))}
    </div>
  );
}
