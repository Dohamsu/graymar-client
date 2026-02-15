"use client";

import { Coins, FlaskConical, Key, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InventoryItem } from "@/types/game";
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
}

export function InventoryTab({ inventory, gold }: InventoryTabProps) {
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
      <div className="flex items-center gap-3 rounded border border-[var(--gold)]/30 bg-[var(--bg-card)] p-3">
        <Coins size={20} className="text-[var(--gold)]" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-muted)]">
            소지금
          </span>
          <span className="font-display text-xl font-medium text-[var(--gold)]">
            {gold.toLocaleString()} G
          </span>
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
                {items.map(({ itemId, qty, meta }) => (
                  <div
                    key={itemId}
                    className="flex items-start gap-3 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
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
                      </div>
                      {meta.description && (
                        <span className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                          {meta.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
