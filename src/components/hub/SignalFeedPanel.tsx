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
  1: "text-zinc-400",
  2: "text-blue-400",
  3: "text-yellow-400",
  4: "text-orange-400",
  5: "text-red-400",
};

const SEVERITY_BG: Record<number, string> = {
  1: "border-zinc-700",
  2: "border-blue-800",
  3: "border-yellow-800",
  4: "border-orange-800",
  5: "border-red-800 bg-red-950/30",
};

export function SignalFeedPanel({ signals }: Props) {
  if (signals.length === 0) return null;

  // severity 높은 것 우선, 같으면 최신 우선
  const sorted = [...signals].sort((a, b) => b.severity - a.severity);

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        시그널 피드
      </h3>
      {sorted.map((signal) => (
        <div
          key={signal.id}
          className={`border-l-2 pl-2 py-1 text-xs ${SEVERITY_BG[signal.severity] ?? "border-zinc-700"}`}
        >
          <span
            className={`font-mono text-[10px] ${SEVERITY_COLORS[signal.severity] ?? "text-zinc-400"}`}
          >
            [{CHANNEL_LABELS[signal.channel] ?? signal.channel}]
          </span>{" "}
          <span className="text-zinc-300">{signal.text}</span>
        </div>
      ))}
    </div>
  );
}
