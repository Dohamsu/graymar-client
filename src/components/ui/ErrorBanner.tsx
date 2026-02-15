"use client";

import { X, AlertTriangle } from "lucide-react";
import { useGameStore } from "@/store/game-store";

export function ErrorBanner() {
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);

  if (!error) return null;

  return (
    <div className="flex w-full items-center gap-3 border-b border-[var(--hp-red)]/30 bg-[var(--hp-red)]/10 px-4 py-3">
      <AlertTriangle size={16} className="shrink-0 text-[var(--hp-red)]" />
      <p className="flex-1 text-xs text-[var(--hp-red)]">{error}</p>
      <button
        onClick={clearError}
        className="shrink-0 text-[var(--hp-red)] hover:opacity-70"
      >
        <X size={14} />
      </button>
    </div>
  );
}
