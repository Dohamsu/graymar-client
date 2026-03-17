"use client";

import { Globe } from "lucide-react";
import type { WorldDeltaSummaryUI } from "@/types/game";

const URGENCY_BORDER: Record<string, string> = {
  HIGH: "border-l-[var(--hp-red)]",
  MID: "border-l-[var(--gold)]",
  LOW: "border-l-[var(--border-primary)]",
};

export function WorldDeltaSummaryCard({
  summary,
}: {
  summary: WorldDeltaSummaryUI | null;
}) {
  if (!summary) return null;

  const borderClass = URGENCY_BORDER[summary.urgency] ?? URGENCY_BORDER.LOW;

  return (
    <div
      className={`mb-4 rounded-lg border border-[var(--border-primary)] border-l-4 ${borderClass} bg-[var(--bg-card)] px-4 py-3`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Globe size={14} className="text-[var(--text-muted)]" />
        <span className="text-xs font-semibold tracking-[1px] text-[var(--text-muted)]">
          세계 변화
        </span>
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
        {summary.headline}
      </p>
      {summary.visibleChanges.length > 1 && (
        <ul className="flex flex-col gap-0.5">
          {summary.visibleChanges.slice(1).map((change, i) => (
            <li
              key={i}
              className="text-xs text-[var(--text-secondary)] before:content-['·'] before:mr-1.5 before:text-[var(--text-muted)]"
            >
              {change}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
