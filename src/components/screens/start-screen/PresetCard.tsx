"use client";
// [arch/77 P5a] 출신 카드 — StartScreen.tsx에서 분리.
import type { CharacterPreset } from "@/types/game";
import { STAT_COLORS_MAP, STAT_HINTS, STAT_LABELS } from "./stat-config";

export function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: CharacterPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const itemsText = preset.startingItems
    .map((i) => (i.qty > 1 ? `${i.name} x${i.qty}` : i.name))
    .join(", ");

  const selectedLabel = selected ? "선택됨" : "선택";

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${preset.name} 출신 ${selectedLabel}. ${preset.subtitle}`}
      onClick={onSelect}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-lg border text-left transition-all ${
        selected
          ? "border-[var(--gold)] bg-[rgba(201,169,98,0.08)] shadow-[0_0_20px_rgba(201,169,98,0.18)]"
          : "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[rgba(201,169,98,0.4)] hover:bg-[rgba(201,169,98,0.04)]"
      }`}
    >
      <div className="flex flex-col gap-3 px-4 py-4">
        {/* Title */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">{preset.name}</h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${
                selected
                  ? "border-[var(--gold)] bg-[rgba(201,169,98,0.16)] text-[var(--gold)]"
                  : "border-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >
              {selected ? "✓ 선택됨" : "선택"}
            </span>
          </div>
          <p className="text-sm text-[var(--gold)]">{preset.subtitle}</p>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{preset.description}</p>

        {/* Playstyle hint */}
        <p className="rounded-md bg-[var(--bg-secondary)] px-3 py-2 text-xs leading-relaxed text-[var(--text-muted)]">
          {preset.playstyleHint}
        </p>

        {/* Stat bars */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          {(["str", "dex", "wit", "con", "per", "cha"] as const).map((key) => {
            const value = preset.stats[key] ?? 0;
            const max = 18;
            const pct = Math.min(100, Math.round((value / max) * 100));
            const colors = STAT_COLORS_MAP;
            return (
              <div key={key} className="flex items-center gap-1.5" title={STAT_HINTS[key]}>
                <span className="w-12 shrink-0 whitespace-nowrap text-right font-semibold text-[var(--text-muted)]">{STAT_LABELS[key]}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors[key] }} />
                </div>
                <span className="w-5 text-center font-medium text-[var(--text-secondary)]">{value}</span>
              </div>
            );
          })}
        </div>

        {/* Starting gold & items */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-primary)] pt-3 text-sm text-[var(--text-muted)]">
          <span className="text-[var(--gold)]">{preset.startingGold}G</span>
          {itemsText && (
            <>
              <span className="text-[var(--border-primary)]">|</span>
              <span>{itemsText}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

