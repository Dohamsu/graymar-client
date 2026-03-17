"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { GameNotification } from "@/types/game";

const AUTO_DISMISS_MS = 5000;

const OUTCOME_STYLES: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  SUCCESS: { icon: CheckCircle, color: "text-[var(--stamina-green)]", bg: "border-[var(--stamina-green)]" },
  PARTIAL: { icon: AlertTriangle, color: "text-[var(--gold)]", bg: "border-[var(--gold)]" },
  FAIL: { icon: XCircle, color: "text-[var(--hp-red)]", bg: "border-[var(--hp-red)]" },
};

export function TurnResultBanner({
  notifications,
}: {
  notifications: GameNotification[];
}) {
  const banner = notifications.find(
    (n) => n.scope === "TURN_RESULT" && n.presentation === "BANNER",
  );

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (banner) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [banner?.id]);

  if (!visible || !banner) return null;

  // priority로 outcome 추론
  const outcomeKey =
    banner.title.includes("성공") ? "SUCCESS"
    : banner.title.includes("실패") ? "FAIL"
    : "PARTIAL";

  const style = OUTCOME_STYLES[outcomeKey] ?? OUTCOME_STYLES.PARTIAL;
  const Icon = style.icon;

  return (
    <div
      className={`mx-4 mt-2 flex items-center gap-3 rounded-lg border-l-4 ${style.bg} bg-[var(--bg-card)] px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <Icon size={16} className={`shrink-0 ${style.color}`} />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {banner.title}
        </span>
        {banner.body && (
          <span className="text-xs text-[var(--text-secondary)]">
            {banner.body}
          </span>
        )}
      </div>
    </div>
  );
}
