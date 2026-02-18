"use client";

import { Sun, Moon } from "lucide-react";

export function TimePhaseIndicator({ timePhase }: { timePhase: "DAY" | "NIGHT" }) {
  const isDay = timePhase === "DAY";

  return (
    <div className="flex items-center gap-1.5">
      {isDay ? (
        <Sun size={14} className="text-[var(--gold)]" />
      ) : (
        <Moon size={14} className="text-[var(--info-blue)]" />
      )}
      <span
        className={`text-xs font-semibold ${
          isDay ? "text-[var(--gold)]" : "text-[var(--info-blue)]"
        }`}
      >
        {isDay ? "낮" : "밤"}
      </span>
    </div>
  );
}
