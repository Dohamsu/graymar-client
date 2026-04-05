"use client";

import { useState } from "react";
import { Coins, FlaskConical, Key, Search, Shield, TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InventoryItem, InventoryChanges, EquipmentBagItem } from "@/types/game";
import { ITEM_CATALOG, type ItemMeta, getItemImagePath } from "@/data/items";
import { useGameStore } from "@/store/game-store";
import { STAT_COLORS, STAT_KOREAN_NAMES } from "@/data/stat-descriptions";

/** Thumbnail with fallback to Lucide icon */
function ItemThumbnail({
  itemId,
  fallbackIcon: FallbackIcon,
  fallbackColor,
  size = 32,
}: {
  itemId: string;
  fallbackIcon: LucideIcon;
  fallbackColor: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = getItemImagePath(itemId);

  if (imgError || !src) {
    return <FallbackIcon size={size * 0.55} style={{ color: fallbackColor }} />;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic item icon with onError fallback */
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded object-cover"
      onError={() => setImgError(true)}
    />
  );
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  CONSUMABLE: { label: "소비품", icon: FlaskConical, color: "var(--success-green)" },
  KEY_ITEM: { label: "핵심 아이템", icon: Key, color: "var(--gold)" },
  CLUE: { label: "단서", icon: Search, color: "var(--info-blue)" },
};

const TYPE_ORDER = ["CONSUMABLE", "CLUE", "KEY_ITEM"];

const RARITY_COLORS: Record<string, string> = {
  COMMON: "#9CA3AF",
  RARE: "#3B82F6",
  UNIQUE: "#A855F7",
  LEGENDARY: "#F59E0B",
};

const SLOT_LABELS: Record<string, string> = {
  WEAPON: "무기",
  ARMOR: "방어구",
  TACTICAL: "전술",
  POLITICAL: "정치",
  RELIC: "유물",
};

interface InventoryTabProps {
  inventory: InventoryItem[];
  gold: number;
  changes?: InventoryChanges | null;
}

export function InventoryTab({ inventory, gold, changes }: InventoryTabProps) {
  const equipmentBag = useGameStore((s) => s.equipmentBag);
  const equipItem = useGameStore((s) => s.equipItem);
  const consumeItem = useGameStore((s) => s.useItem);
  const isSubmitting = useGameStore((s) => s.isSubmitting);

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

  const handleEquip = (bagItem: EquipmentBagItem) => {
    if (isSubmitting) return;
    equipItem(bagItem.instanceId);
  };

  const handleUseItem = (itemId: string) => {
    if (isSubmitting) return;
    consumeItem(itemId);
  };

  // 소모품 중 사용 가능한 아이템 (치료/기력 회복)
  const USABLE_ITEMS = new Set([
    'ITEM_MINOR_HEALING',
    'ITEM_SUPERIOR_HEALING',
    'ITEM_STAMINA_TONIC',
  ]);

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
              {(gold ?? 0).toLocaleString()} G
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

      {/* Equipment Bag */}
      {equipmentBag.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[var(--purple)]" />
            <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
              미장착 장비
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              ({equipmentBag.length})
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {equipmentBag.map((bagItem) => {
              const rarityColor = bagItem.rarity
                ? RARITY_COLORS[bagItem.rarity] ?? "var(--text-muted)"
                : "var(--text-muted)";

              return (
                <div
                  key={bagItem.instanceId}
                  className="flex items-center gap-3 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] p-3"
                  style={{ borderColor: `${rarityColor}30` }}
                >
                  {/* Item thumbnail */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
                    style={{
                      borderColor: `${rarityColor}40`,
                      backgroundColor: `color-mix(in srgb, ${rarityColor} 8%, transparent)`,
                    }}
                  >
                    <ItemThumbnail
                      itemId={bagItem.baseItemId ?? bagItem.instanceId}
                      fallbackIcon={Shield}
                      fallbackColor={rarityColor}
                      size={32}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="truncate text-[11px] font-medium"
                        style={{ color: rarityColor }}
                      >
                        {bagItem.displayName}
                      </span>
                      {bagItem.rarity && (
                        <span
                          className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${rarityColor} 15%, transparent)`,
                            color: rarityColor,
                          }}
                        >
                          {bagItem.rarity}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {SLOT_LABELS[bagItem.slot] ?? bagItem.slot}
                    </span>
                    {bagItem.statBonus && Object.keys(bagItem.statBonus).length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        {Object.entries(bagItem.statBonus).map(([stat, val]) => (
                          <span
                            key={stat}
                            className="text-[9px] font-medium"
                            style={{ color: STAT_COLORS[stat.toUpperCase()] ?? 'var(--text-muted)' }}
                          >
                            {STAT_KOREAN_NAMES[stat.toLowerCase()] ?? stat} {val > 0 ? '+' : ''}{val}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleEquip(bagItem)}
                    className="shrink-0 rounded border border-[var(--gold)]/30 bg-[var(--gold)]/8 px-2.5 py-1.5 text-[10px] font-medium text-[var(--gold)] transition-colors hover:bg-[var(--gold)]/15 disabled:opacity-50"
                  >
                    장착
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      {grouped.length === 0 && inventory.length === 0 && equipmentBag.length === 0 ? (
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
                      {/* Item thumbnail */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]"
                      >
                        <ItemThumbnail
                          itemId={itemId}
                          fallbackIcon={config.icon}
                          fallbackColor={config.color}
                          size={32}
                        />
                      </div>

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
                            <span className="animate-fade-in rounded bg-[var(--success-green)]/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--success-green)]">
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

                      {/* 소모품 사용 버튼 */}
                      {meta.type === 'CONSUMABLE' && USABLE_ITEMS.has(itemId) && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleUseItem(itemId)}
                          className="shrink-0 rounded border border-[var(--success-green)]/30 bg-[var(--success-green)]/8 px-2.5 py-1.5 text-[10px] font-medium text-[var(--success-green)] transition-colors hover:bg-[var(--success-green)]/15 disabled:opacity-50"
                        >
                          사용
                        </button>
                      )}
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
