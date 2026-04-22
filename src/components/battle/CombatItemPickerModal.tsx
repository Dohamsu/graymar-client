"use client";

import { X, FlaskConical } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { ITEM_CATALOG } from "@/data/items";

// architecture/42 전투 UI 버튼 폼 — 아이템 사용 모달

interface CombatItemPickerModalProps {
  onSelect: (choiceId: string) => void;
  onClose: () => void;
}

export function CombatItemPickerModal({
  onSelect,
  onClose,
}: CombatItemPickerModalProps) {
  const inventory = useGameStore((s) => s.inventory);

  // 전투 중 사용 가능 = CONSUMABLE 전체 (서버가 combat.effect 없으면 거부)
  const combatItems = inventory.filter((item) => {
    const meta = ITEM_CATALOG[item.itemId];
    return item.qty > 0 && meta?.type === 'CONSUMABLE';
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--gold)]/40 bg-[var(--bg-card)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-[2px] text-[var(--text-muted)]">
              전투 아이템 사용
            </span>
            <h3 className="text-[13px] font-semibold text-[var(--gold)]">
              사용할 아이템을 선택하세요
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {combatItems.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--text-muted)]">
            사용 가능한 전투 아이템이 없습니다
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {combatItems.map((item) => {
              const meta = ITEM_CATALOG[item.itemId];
              if (!meta) return null;
              return (
                <button
                  key={item.itemId}
                  type="button"
                  onClick={() => {
                    onSelect(`use_item_${item.itemId}`);
                    onClose();
                  }}
                  className="flex items-center gap-3 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-left transition-colors hover:border-[var(--gold)]/50 hover:bg-[var(--gold)]/5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--success-green)]/30 bg-[var(--success-green)]/8">
                    <FlaskConical size={18} className="text-[var(--success-green)]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[var(--text-primary)]">
                        {meta.name}
                      </span>
                      <span className="rounded-full bg-[var(--success-green)]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--success-green)]">
                        x{item.qty}
                      </span>
                    </div>
                    {meta.description && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {meta.description}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
