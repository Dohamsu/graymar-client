"use client";

import { MapPin, ArrowLeft } from "lucide-react";
import { useGameStore } from "@/store/game-store";

interface LocationHeaderProps {
  locationName: string;
  toneHint?: string;
}

export function LocationHeader({ locationName, toneHint }: LocationHeaderProps) {
  const submitChoice = useGameStore((s) => s.submitChoice);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const operationProgress = useGameStore((s) => s.operationProgress);

  return (
    <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 py-2.5">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-[var(--text-muted)]" />
        <span className="font-display text-base text-[var(--text-secondary)]">
          {locationName}
        </span>
        {toneHint && toneHint !== "neutral" && (
          <span className="text-xs text-[var(--text-muted)]">
            ({toneHint === "danger" ? "위험" : toneHint === "tense" ? "긴장" : toneHint})
          </span>
        )}
        {operationProgress && operationProgress.active && (
          <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            스텝 {operationProgress.currentStep}/{operationProgress.maxSteps}
          </span>
        )}
      </div>
      <button
        onClick={() => submitChoice("go_hub")}
        disabled={isSubmitting}
        className="flex items-center gap-1.5 rounded-md border border-[var(--border-primary)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)] disabled:opacity-50"
      >
        <ArrowLeft size={12} />
        거점 복귀
      </button>
    </div>
  );
}
