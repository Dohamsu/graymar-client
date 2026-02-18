"use client";

import type { WorldStateUI } from "@/types/game";

const SAFETY_LABELS: Record<string, string> = {
  SAFE: "안전",
  ALERT: "경계",
  DANGER: "위험",
};

const SAFETY_COLORS: Record<string, string> = {
  SAFE: "bg-[var(--success-green)]",
  ALERT: "bg-[var(--gold)]",
  DANGER: "bg-[var(--hp-red)]",
};

const SAFETY_TEXT_COLORS: Record<string, string> = {
  SAFE: "text-[var(--success-green)]",
  ALERT: "text-[var(--gold)]",
  DANGER: "text-[var(--hp-red)]",
};

export function HeatGauge({ worldState }: { worldState: WorldStateUI }) {
  const pct = Math.min(100, Math.max(0, worldState.hubHeat));
  const safety = worldState.hubSafety;
  const barColor = SAFETY_COLORS[safety] ?? SAFETY_COLORS.SAFE;
  const textColor = SAFETY_TEXT_COLORS[safety] ?? SAFETY_TEXT_COLORS.SAFE;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[11px] font-semibold ${textColor}`}>
        {SAFETY_LABELS[safety] ?? safety}
      </span>
      <div className="h-[6px] w-[70px] overflow-hidden rounded-full bg-[var(--border-primary)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-secondary)]">{pct}</span>
    </div>
  );
}
