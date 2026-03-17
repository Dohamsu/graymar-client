"use client";

import { AlertTriangle, Flame } from "lucide-react";
import type { GameNotification } from "@/types/game";

const MAX_PINNED = 3;

const PRIORITY_STYLES: Record<string, { border: string; icon: string }> = {
  CRITICAL: {
    border: "border-[var(--hp-red)]",
    icon: "text-[var(--hp-red)]",
  },
  HIGH: {
    border: "border-[var(--gold)]",
    icon: "text-[var(--gold)]",
  },
};

export function PinnedAlertStack({
  alerts,
}: {
  alerts: GameNotification[];
}) {
  if (!alerts || alerts.length === 0) return null;

  const visible = alerts.slice(0, MAX_PINNED);

  return (
    <div className="flex flex-col gap-2 mb-4">
      {visible.map((alert) => {
        const style = PRIORITY_STYLES[alert.priority] ?? PRIORITY_STYLES.HIGH;
        const Icon = alert.kind === "WORLD" ? Flame : AlertTriangle;

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg border-l-4 ${style.border} bg-[var(--bg-card)] px-4 py-3`}
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${style.icon}`} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {alert.title}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {alert.body}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
