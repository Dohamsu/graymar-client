"use client";

import type { EquipmentItem } from "@/types/game";
import { useGameStore } from "@/store/game-store";

const TYPE_COLORS: Record<string, string> = {
  COMBAT: "var(--hp-red)",
  POLITICAL: "var(--info-blue)",
};

interface SetBonusDisplayProps {
  equipment: EquipmentItem[];
}

export function SetBonusDisplay({ equipment }: SetBonusDisplayProps) {
  const setDefinitions = useGameStore((s) => s.setDefinitions);

  // 장착된 아이템의 baseItemId 수집
  const equippedBaseIds = new Set(
    equipment.map((e) => e.baseItemId).filter(Boolean) as string[],
  );

  // 세트별 보유 피스 수 계산
  const activeSets = setDefinitions.map((def) => {
    const ownedCount = def.pieces.filter((p) => equippedBaseIds.has(p)).length;
    return { ...def, ownedCount };
  }).filter((s) => s.ownedCount > 0);

  if (activeSets.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
        세트 보너스
      </span>
      {activeSets.map((s) => {
        const typeColor = TYPE_COLORS[s.type] ?? "var(--text-muted)";
        const is2Active = s.ownedCount >= 2;
        const is3Active = s.ownedCount >= 3;

        return (
          <div
            key={s.setId}
            className="flex flex-col gap-2 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--text-primary)]">
                {s.name}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                  color: typeColor,
                }}
              >
                {s.ownedCount}/{s.pieces.length}
              </span>
            </div>

            {/* 2-piece bonus */}
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  is2Active ? "bg-[var(--success-green)]" : "bg-[var(--text-muted)]/40"
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                  2세트
                </span>
                <span
                  className={`text-[10px] ${
                    is2Active
                      ? "font-medium text-[var(--success-green)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {s.bonus2.description}
                </span>
              </div>
            </div>

            {/* 3-piece bonus */}
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  is3Active ? "bg-[var(--gold)]" : "bg-[var(--text-muted)]/40"
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                  3세트
                </span>
                <span
                  className={`text-[10px] ${
                    is3Active
                      ? "font-medium text-[var(--gold)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {s.bonus3.description}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
