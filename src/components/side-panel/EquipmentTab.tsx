"use client";

import { useState, useCallback } from "react";
import { Sword, Shirt, HardHat, Gem, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EquipmentItem } from "@/types/game";
import { useGameStore } from "@/store/game-store";
import { SetBonusDisplay } from "./SetBonusDisplay";
import { getItemImagePath } from "@/data/items";

/** Equipment image with Lucide icon fallback */
function EquipImage({
  itemId,
  fallbackIcon: FallbackIcon,
  fallbackColor,
  size = 20,
}: {
  itemId: string;
  fallbackIcon: LucideIcon;
  fallbackColor: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = getItemImagePath(itemId);

  if (imgError || !src) {
    return <FallbackIcon size={size} style={{ color: fallbackColor }} />;
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic item icon with onError fallback */
    <img
      src={src}
      alt=""
      width={size + 16}
      height={size + 16}
      className="rounded object-cover"
      onError={() => setImgError(true)}
    />
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EQUIP_ICON_MAP: Record<string, LucideIcon> = {
  sword: Sword,
  shirt: Shirt,
  "hard-hat": HardHat,
  gem: Gem,
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: "#9CA3AF",
  RARE: "#3B82F6",
  UNIQUE: "#A855F7",
  LEGENDARY: "#F59E0B",
};

const SLOT_ORDER = ["WEAPON", "ARMOR", "TACTICAL", "POLITICAL", "RELIC"] as const;

const SLOT_LABELS: Record<string, string> = {
  WEAPON: "무기",
  ARMOR: "방어구",
  TACTICAL: "전술 장비",
  POLITICAL: "정치 장비",
  RELIC: "유물",
};

const SLOT_ICON_MAP: Record<string, LucideIcon> = {
  WEAPON: Sword,
  ARMOR: Shirt,
  TACTICAL: HardHat,
  POLITICAL: Gem,
  RELIC: Gem,
};

const STAT_LABELS: Record<string, string> = {
  atk: "ATK",
  def: "DEF",
  acc: "ACC",
  eva: "EVA",
  speed: "SPD",
  crit: "CRIT",
  critDmg: "CDMG",
  resist: "RES",
  maxHP: "HP",
};

// ---------------------------------------------------------------------------
// EquipmentTab
// ---------------------------------------------------------------------------

export function EquipmentTab() {
  const characterInfo = useGameStore((s) => s.characterInfo);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const equipment = characterInfo?.equipment ?? [];

  // 슬롯별 장착 아이템 맵
  const equippedBySlot = new Map<string, EquipmentItem>();
  for (const item of equipment) {
    equippedBySlot.set(item.slot, item);
  }

  const handleUnequip = useCallback(
    (item: EquipmentItem) => {
      if (isSubmitting) return;
      setSelectedItem(null);
      unequipItem(item.slot);
    },
    [unequipItem, isSubmitting],
  );

  const handleSlotClick = useCallback((item: EquipmentItem | undefined) => {
    if (item) {
      setSelectedItem((prev) => (prev?.slot === item.slot ? null : item));
    }
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Slot Grid */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--text-secondary)]">
          장비 슬롯
        </span>
        <div className="flex flex-col gap-2">
          {SLOT_ORDER.map((slot) => {
            const item = equippedBySlot.get(slot);
            const SlotIcon = SLOT_ICON_MAP[slot] ?? Gem;
            const ItemIcon = item ? (EQUIP_ICON_MAP[item.icon] ?? Gem) : SlotIcon;
            const rarityColor = item?.rarity
              ? RARITY_COLORS[item.rarity] ?? "var(--text-muted)"
              : undefined;
            const isSelected = selectedItem?.slot === slot;

            return (
              <button
                key={slot}
                type="button"
                onClick={() => handleSlotClick(item)}
                className={`flex items-center gap-3 rounded border p-3 text-left transition-all ${
                  isSelected
                    ? "border-[var(--gold)]/60 bg-[var(--gold)]/8"
                    : item
                      ? "border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[var(--gold)]/30"
                      : "border-[var(--border-primary)]/50 bg-[var(--bg-card)]/50"
                }`}
                style={
                  item && rarityColor
                    ? { borderColor: isSelected ? undefined : `${rarityColor}30` }
                    : undefined
                }
              >
                {/* Icon / Image */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
                  style={{
                    borderColor: rarityColor
                      ? `${rarityColor}40`
                      : "var(--border-primary)",
                    backgroundColor: rarityColor
                      ? `color-mix(in srgb, ${rarityColor} 8%, transparent)`
                      : "var(--bg-secondary)",
                  }}
                >
                  {item ? (
                    <EquipImage
                      itemId={item.baseItemId ?? ""}
                      fallbackIcon={ItemIcon}
                      fallbackColor={rarityColor ?? "var(--text-muted)"}
                    />
                  ) : (
                    <SlotIcon size={20} style={{ color: "var(--text-muted)" }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)]">
                    {SLOT_LABELS[slot]}
                  </span>
                  {item ? (
                    <>
                      <span
                        className="truncate text-[11px] font-medium"
                        style={{ color: rarityColor ?? "var(--text-primary)" }}
                      >
                        {item.name}
                      </span>
                      {item.statBonus && Object.keys(item.statBonus).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(item.statBonus).map(([key, val]) => (
                            <span
                              key={key}
                              className="text-[9px] text-[var(--text-muted)]"
                            >
                              {STAT_LABELS[key] ?? key}{" "}
                              <span className="text-[var(--success-green)]">
                                +{val}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      빈 슬롯
                    </span>
                  )}
                </div>

                {/* Rarity badge */}
                {item?.rarity && (
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${rarityColor} 15%, transparent)`,
                      color: rarityColor,
                    }}
                  >
                    {item.rarity}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Item Detail Popup */}
      {selectedItem && (
        <div className="animate-fade-in flex flex-col gap-3 rounded border border-[var(--gold)]/30 bg-[var(--bg-card)] p-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span
                className="text-[13px] font-semibold"
                style={{
                  color:
                    RARITY_COLORS[selectedItem.rarity ?? ""] ??
                    "var(--text-primary)",
                }}
              >
                {selectedItem.name}
              </span>
              {selectedItem.baseName !== selectedItem.name && (
                <span className="text-[10px] text-[var(--text-muted)]">
                  {selectedItem.baseName}
                </span>
              )}
              <span className="text-[9px] text-[var(--text-muted)]">
                {SLOT_LABELS[selectedItem.slot] ?? selectedItem.slot}
                {selectedItem.rarity ? ` \u00b7 ${selectedItem.rarity}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>

          {/* Stat Bonuses */}
          {selectedItem.statBonus &&
            Object.keys(selectedItem.statBonus).length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)]">
                  스탯 보너스
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(selectedItem.statBonus).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded border border-[var(--border-primary)]/50 bg-[var(--bg-secondary)] px-2 py-1"
                    >
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {STAT_LABELS[key] ?? key}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--success-green)]">
                        +{val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Set info */}
          {selectedItem.setId && (
            <span className="text-[9px] text-[var(--info-blue)]">
              세트: {selectedItem.setId.replace("SET_", "").replace(/_/g, " ")}
            </span>
          )}

          {/* Unequip button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleUnequip(selectedItem)}
            className="mt-1 w-full rounded border border-[var(--hp-red)]/30 bg-[var(--hp-red)]/8 px-3 py-2 text-[11px] font-medium text-[var(--hp-red)] transition-colors hover:bg-[var(--hp-red)]/15 disabled:opacity-50"
          >
            장착 해제
          </button>
        </div>
      )}

      {/* Set Bonuses */}
      <SetBonusDisplay equipment={equipment} />
    </div>
  );
}
