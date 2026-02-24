"use client";

import { Sun, Moon, Sunrise, Sunset } from "lucide-react";

type TimePhaseV2 = "DAWN" | "DAY" | "DUSK" | "NIGHT";

const PHASE_CONFIG: Record<TimePhaseV2, { icon: typeof Sun; label: string; color: string }> = {
  DAWN: { icon: Sunrise, label: "새벽", color: "text-orange-300" },
  DAY: { icon: Sun, label: "낮", color: "text-[var(--gold)]" },
  DUSK: { icon: Sunset, label: "황혼", color: "text-purple-400" },
  NIGHT: { icon: Moon, label: "밤", color: "text-[var(--info-blue)]" },
};

interface Props {
  timePhase: "DAY" | "NIGHT";
  phaseV2?: TimePhaseV2;
  day?: number;
}

export function TimePhaseIndicator({ timePhase, phaseV2, day }: Props) {
  // phaseV2가 있으면 4상 표시, 없으면 기존 2상
  const phase = phaseV2 ?? (timePhase === "DAY" ? "DAY" : "NIGHT");
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <Icon size={14} className={config.color} />
      <span className={`text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
      {day != null && (
        <span className="text-[10px] text-[var(--text-muted)]">
          {day}일차
        </span>
      )}
    </div>
  );
}
