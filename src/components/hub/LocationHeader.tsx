"use client";

import { MapPin, ArrowLeft, Store } from "lucide-react";
import { useGameStore } from "@/store/game-store";

interface LocationHeaderProps {
  locationName: string;
  toneHint?: string;
}

export function LocationHeader({ locationName, toneHint }: LocationHeaderProps) {
  const submitChoice = useGameStore((s) => s.submitChoice);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const operationProgress = useGameStore((s) => s.operationProgress);
  const shops = useGameStore((s) => s.shops);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2.5 md:px-6">
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
          <span className="ml-2 rounded-full bg-[var(--bg-card)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-primary)]">
            스텝 {operationProgress.currentStep}/{operationProgress.maxSteps}
          </span>
        )}
        {/* 상점 존재 칩 — 소지품 탭 상점 진열로 유도 (arch/68 부록 E) */}
        {shops.length > 0 && (
          <span
            className="ml-1 flex items-center gap-1 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/8 px-2 py-0.5 text-[10px] font-medium text-[var(--gold)]"
            title={`${shops.map((s) => s.name).join(", ")} — 소지품 탭에서 구매할 수 있습니다`}
          >
            <Store size={10} />
            {shops.length === 1 ? shops[0]!.name : `상점 ${shops.length}곳`}
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
