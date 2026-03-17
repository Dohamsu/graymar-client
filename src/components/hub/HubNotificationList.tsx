"use client";

import { Bell, AlertTriangle, Globe, Clock } from "lucide-react";
import type { GameNotification } from "@/types/game";

const KIND_ICONS: Record<string, typeof Bell> = {
  INCIDENT: AlertTriangle,
  WORLD: Globe,
  DEADLINE: Clock,
  SYSTEM: Bell,
  NPC: Bell,
  ACHIEVEMENT: Bell,
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: "bg-[var(--hp-red)]",
  HIGH: "bg-[var(--gold)]",
  MID: "bg-[var(--text-muted)]",
  LOW: "bg-[var(--border-primary)]",
};

export function HubNotificationList({
  notifications,
}: {
  notifications: GameNotification[];
}) {
  // FEED_ITEM만 표시 (HUB/GLOBAL scope)
  const feedItems = notifications.filter(
    (n) =>
      n.presentation === "FEED_ITEM" &&
      (n.scope === "HUB" || n.scope === "GLOBAL"),
  );

  if (feedItems.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-semibold tracking-[2px] text-[var(--text-muted)]">
        도시 소식
      </h3>
      <div className="flex flex-col gap-2">
        {feedItems.map((notif) => {
          const Icon = KIND_ICONS[notif.kind] ?? Bell;
          const dotClass = PRIORITY_DOT[notif.priority] ?? PRIORITY_DOT.LOW;

          return (
            <div
              key={notif.id}
              className="flex items-start gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-3"
            >
              <div className="relative mt-0.5 shrink-0">
                <Icon size={14} className="text-[var(--text-muted)]" />
                <span
                  className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ${dotClass}`}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {notif.title}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {notif.body}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
