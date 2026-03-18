"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { GameNotification } from "@/types/game";

const AUTO_FADE_MS = 3000;
const MAX_TOASTS = 3;

export function LocationToastLayer({
  notifications,
}: {
  notifications: GameNotification[];
}) {
  const toasts = useMemo(
    () =>
      notifications
        .filter((n) => n.scope === "LOCATION" && n.presentation === "TOAST")
        .slice(0, MAX_TOASTS),
    [notifications],
  );

  const toastKey = useMemo(() => toasts.map((t) => t.id).join(","), [toasts]);
  const [fadedKey, setFadedKey] = useState("");

  useEffect(() => {
    if (!toastKey) return;
    const timer = setTimeout(() => setFadedKey(toastKey), AUTO_FADE_MS);
    return () => clearTimeout(timer);
  }, [toastKey]);

  if (toasts.length === 0) return null;

  const visible = toastKey !== fadedKey;

  return (
    <div className="pointer-events-none fixed bottom-28 right-4 z-40 flex flex-col gap-2 lg:bottom-20 lg:right-8">
      {toasts.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2.5 shadow-lg transition-opacity duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Info size={14} className="shrink-0 text-[var(--text-muted)]" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {notification.title}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {notification.body}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
