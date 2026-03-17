"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import type { GameNotification } from "@/types/game";

const AUTO_FADE_MS = 3000;
const MAX_TOASTS = 3;

interface ToastState {
  notification: GameNotification;
  visible: boolean;
}

export function LocationToastLayer({
  notifications,
}: {
  notifications: GameNotification[];
}) {
  const toasts = notifications.filter(
    (n) => n.scope === "LOCATION" && n.presentation === "TOAST",
  );

  const [activeToasts, setActiveToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    if (toasts.length === 0) return;

    const newToasts = toasts
      .slice(0, MAX_TOASTS)
      .map((n) => ({ notification: n, visible: true }));

    setActiveToasts(newToasts);

    const timer = setTimeout(() => {
      setActiveToasts((prev) =>
        prev.map((t) => ({ ...t, visible: false })),
      );
    }, AUTO_FADE_MS);

    return () => clearTimeout(timer);
  }, [toasts.map((t) => t.id).join(",")]);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none lg:bottom-20 lg:right-8">
      {activeToasts.map((toast) => (
        <div
          key={toast.notification.id}
          className={`flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2.5 shadow-lg transition-opacity duration-500 ${
            toast.visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <Info size={14} className="shrink-0 text-[var(--text-muted)]" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {toast.notification.title}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {toast.notification.body}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
