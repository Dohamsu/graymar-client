"use client";

import { Coins, FlaskConical, Key, Search, TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InventoryItem, InventoryChanges } from "@/types/game";
import { ITEM_CATALOG, type ItemMeta } from "@/data/items";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  CONSUMABLE: { label: "소비품", icon: FlaskConical, color: "var(--success-green)" },
  KEY_ITEM: { label: "핵심 아이템", icon: Key, color: "var(--gold)" },
  CLUE: { label: "단서", icon: Search, color: "var(--info-blue)" },
};

const TYPE_ORDER = ["CONSUMABLE", "CLUE", "KEY_ITEM"];

interface InventoryTabProps {
  inventory: InventoryItem[];
  gold: number;
  changes?: InventoryChanges | null;
}

export function InventoryTab({ inventory, gold, changes }: InventoryTabProps) {
  // 변경된 아이템 ID 추적
  const addedMap = new Map<string, number>();
  const removedMap = new Map<string, number>();
  if (changes) {
    for (const a of changes.itemsAdded) addedMap.set(a.itemId, a.qty);
    for (const r of changes.itemsRemoved) removedMap.set(r.itemId, r.qty);
  }
  const goldDelta = changes?.goldDelta ?? 0;

  // 타입별 그룹핑
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    config: TYPE_CONFIG[type],
    items: inventory
      .filter((item) => {
        const meta = ITEM_CATALOG[item.itemId];
        return meta?.type === type;
      })
      .map((item) => ({
        ...item,
        meta: ITEM_CATALOG[item.itemId] as ItemMeta,
      })),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Gold */}
      <div
        className={`flex items-center gap-3 rounded border p-3 transition-all duration-700 ${
          goldDelta !== 0
            ? goldDelta > 0
              ? "border-[var(--gold)]/60 bg-[var(--gold)]/8"
              : "border-[var(--hp-red)]/40 bg-[var(--hp-red)]/5"
            : "border-[var(--gold)]/30 bg-[var(--bg-card)]"
        }`}
      >
        <Coins size={20} className="text-[var(--gold)]" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-muted)]">
            소지금
          </span>
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-medium text-[var(--gold)]">
              {gold.toLocaleString()} G
            </span>
            {goldDelta !== 0 && (
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold animate-fade-in ${
                  goldDelta > 0 ? "text-[var(--success-green)]" : "text-[var(--hp-red)]"
                }`}
              >
                {goldDelta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {goldDelta > 0 ? "+" : ""}{goldDelta}G
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      {grouped.length === 0 && inventory.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          소지품이 없습니다
        </p>
      ) : (
        grouped.map(({ type, config, items }) => {
          const GroupIcon = config.icon;
          return (
            <div key={type} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <GroupIcon size={12} style={{ color: config.color }} />
                <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
                  {config.label}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  ({items.length})
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.map(({ itemId, qty, meta }) => {
                  const addedQty = addedMap.get(itemId);
                  const removedQty = removedMap.get(itemId);
                  const isNew = addedQty !== undefined && qty === addedQty;
                  const hasChange = addedQty !== undefined || removedQty !== undefined;

                  return (
                    <div
                      key={itemId}
                      className={`flex items-start gap-3 rounded border p-3 transition-all duration-700 ${
                        isNew
                          ? "animate-highlight-new border-[var(--success-green)]/50 bg-[var(--success-green)]/8"
                          : hasChange
                            ? "border-[var(--gold)]/40 bg-[var(--gold)]/5"
                            : "border-[var(--border-primary)] bg-[var(--bg-card)]"
                      }`}
                    >
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-[var(--text-primary)]">
                            {meta.name}
                          </span>
                          {qty > 1 && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                                color: config.color,
                              }}
                            >
                              x{qty}
                            </span>
                          )}
                          {addedQty !== undefined && (
                            <span className="animate-fade-in text-[9px] font-semibold text-[var(--success-green)]">
                              +{addedQty}
                            </span>
                          )}
                          {removedQty !== undefined && (
                            <span className="animate-fade-in text-[9px] font-semibold text-[var(--hp-red)]">
                              -{removedQty}
                            </span>
                          )}
                          {isNew && (
                            <span className="animate-fade-in rounded bg-[var(--success-green)]/20 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-[var(--success-green)]">
                              NEW
                            </span>
                          )}
                        </div>
                        {meta.description && (
                          <span className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                            {meta.description}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
