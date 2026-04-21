"use client";

import { useState } from "react";
import { Coins, FlaskConical, Key, Search, Shield, TrendingUp, TrendingDown, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { InventoryItem, InventoryChanges, EquipmentBagItem, EquipmentItem } from "@/types/game";
import { ITEM_CATALOG, type ItemMeta, getItemImagePath, isUsableInHub } from "@/data/items";
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

const STAT_SHORT_LABELS: Record<string, string> = {
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

interface EquipCompareItem {
  displayName: string;
  rarity?: string;
  statBonus?: Record<string, number>;
}

function EquipCompareCard({
  label,
  item,
  highlight,
}: {
  label: string;
  item: EquipCompareItem;
  highlight?: 'in' | 'out';
}) {
  const rarityColor = item.rarity ? RARITY_COLORS[item.rarity] ?? "var(--text-muted)" : "var(--text-muted)";
  const borderColor = highlight === 'in' ? 'var(--success-green)' : 'var(--hp-red)';
  return (
    <div
      className="flex flex-col gap-1.5 rounded border p-3"
      style={{ borderColor: `${borderColor}55`, backgroundColor: `color-mix(in srgb, ${borderColor} 5%, transparent)` }}
    >
      <span className="text-[9px] font-semibold tracking-wider" style={{ color: borderColor }}>
        {label}
      </span>
      <span className="text-[11px] font-medium" style={{ color: rarityColor }}>
        {item.displayName}
      </span>
      {item.rarity && (
        <span className="text-[9px]" style={{ color: rarityColor }}>
          {item.rarity}
        </span>
      )}
      {item.statBonus && Object.keys(item.statBonus).length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
          {Object.entries(item.statBonus).map(([stat, val]) => (
            <span key={stat} className="text-[9px] text-[var(--text-muted)]">
              {STAT_SHORT_LABELS[stat] ?? STAT_SHORT_LABELS[stat.toLowerCase()] ?? stat}{' '}
              <span className="text-[var(--success-green)]">+{val}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EquipReplaceModal({
  incoming,
  outgoing,
  onConfirm,
  onCancel,
}: {
  incoming: EquipmentBagItem;
  outgoing: EquipmentItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const slotLabel = SLOT_LABELS[incoming.slot] ?? incoming.slot;
  const title = outgoing
    ? `${SLOT_LABELS[outgoing.slot] ?? outgoing.slot} 슬롯을 교체하시겠습니까?`
    : `${slotLabel} 슬롯에 장착하시겠습니까?`;
  const headerLabel = outgoing ? '장비 교체 확인' : '장비 장착 확인';
  const confirmLabel = outgoing ? '교체' : '장착';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--gold)]/40 bg-[var(--bg-card)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] tracking-[2px] text-[var(--text-muted)]">{headerLabel}</span>
            <h3 className="text-[13px] font-semibold text-[var(--gold)]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {outgoing ? (
            <>
              <EquipCompareCard
                label="해제될 장비"
                item={{ displayName: outgoing.name, rarity: outgoing.rarity, statBonus: outgoing.statBonus }}
                highlight="out"
              />
              <div className="flex justify-center text-[var(--text-muted)]">↓</div>
            </>
          ) : (
            <div className="rounded border border-[var(--text-muted)]/30 bg-[var(--bg-secondary)] p-3 text-center text-[10px] text-[var(--text-muted)]">
              {slotLabel} 슬롯이 비어 있습니다
            </div>
          )}
          <EquipCompareCard
            label="장착할 장비"
            item={{ displayName: incoming.displayName, rarity: incoming.rarity, statBonus: incoming.statBonus }}
            highlight="in"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded border border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-2 text-[11px] font-medium text-[var(--gold)] hover:bg-[var(--gold)]/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const characterInfo = useGameStore((s) => s.characterInfo);
  const currentNodeType = useGameStore((s) => s.currentNodeType);

  // 교체 확인 다이얼로그 상태 — 빈 슬롯 장착 시 outgoing=null
  const [equipConfirm, setEquipConfirm] = useState<{
    incoming: EquipmentBagItem;
    outgoing: EquipmentItem | null;
  } | null>(null);

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
    const slotOccupant = characterInfo?.equipment?.find((e) => e.slot === bagItem.slot);
    setEquipConfirm({ incoming: bagItem, outgoing: slotOccupant ?? null });
  };

  const confirmEquipReplace = () => {
    if (!equipConfirm) return;
    equipItem(equipConfirm.incoming.instanceId);
    setEquipConfirm(null);
  };

  const isInCombat = currentNodeType === 'COMBAT';

  const handleUseItem = (itemId: string) => {
    if (isSubmitting || isInCombat) return;
    consumeItem(itemId);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 장비 교체 확인 모달 */}
      {equipConfirm && (
        <EquipReplaceModal
          incoming={equipConfirm.incoming}
          outgoing={equipConfirm.outgoing}
          onConfirm={confirmEquipReplace}
          onCancel={() => setEquipConfirm(null)}
        />
      )}

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

                      {/* 소모품 사용 버튼 — CONSUMABLE 중 hub에서 사용 가능한 것 (HEAL_HP/RESTORE_STAMINA) */}
                      {meta.type === 'CONSUMABLE' && isUsableInHub(itemId) && (
                        <button
                          type="button"
                          disabled={isSubmitting || isInCombat}
                          title={isInCombat ? '전투 중에는 사용할 수 없습니다' : undefined}
                          onClick={() => handleUseItem(itemId)}
                          className="shrink-0 rounded border border-[var(--success-green)]/30 bg-[var(--success-green)]/8 px-2.5 py-1.5 text-[10px] font-medium text-[var(--success-green)] transition-colors hover:bg-[var(--success-green)]/15 disabled:cursor-not-allowed disabled:opacity-40"
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
