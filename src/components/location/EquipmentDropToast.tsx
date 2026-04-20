"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { getItemImagePath } from "@/data/items";

const AUTO_FADE_MS = 5000;
const MAX_VISIBLE = 3;

const RARITY_COLORS: Record<string, string> = {
  COMMON: "#9CA3AF",
  RARE: "#3B82F6",
  UNIQUE: "#A855F7",
  LEGENDARY: "#F59E0B",
};

/**
 * 장비 획득 시 우측 하단에 뜨는 골드 배너. recentEquipmentDrops가 세팅되면
 * AUTO_FADE_MS 후 자동으로 사라지며, 배너 자체를 탭하면 즉시 닫힘.
 */
export function EquipmentDropToast() {
  const drops = useGameStore((s) => s.recentEquipmentDrops);
  const clear = useGameStore((s) => s.clearRecentEquipmentDrops);

  const visibleKey = useMemo(() => drops.map((d) => d.instanceId).join(","), [drops]);
  const [fadedKey, setFadedKey] = useState("");

  useEffect(() => {
    if (!visibleKey) return;
    const fadeTimer = setTimeout(() => setFadedKey(visibleKey), AUTO_FADE_MS - 500);
    const clearTimer = setTimeout(() => clear(), AUTO_FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [visibleKey, clear]);

  if (drops.length === 0) return null;

  const visible = visibleKey !== fadedKey;
  const shown = drops.slice(0, MAX_VISIBLE);
  const extra = drops.length - shown.length;

  return (
    <div className="pointer-events-none fixed bottom-28 right-4 z-40 flex flex-col gap-2 lg:bottom-20 lg:right-8">
      {shown.map((drop) => {
        const rarity = drop.rarity ?? "COMMON";
        const color = RARITY_COLORS[rarity] ?? "var(--gold)";
        const src = getItemImagePath(drop.baseItemId);
        return (
          <button
            type="button"
            key={drop.instanceId}
            onClick={clear}
            className={`pointer-events-auto flex min-w-[240px] items-center gap-3 rounded-lg border px-3 py-2 shadow-lg transition-all duration-500 ${
              visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            }`}
            style={{
              borderColor: `${color}66`,
              backgroundColor: `color-mix(in srgb, ${color} 12%, var(--bg-card))`,
            }}
            aria-label={`${drop.displayName} 획득`}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border"
              style={{ borderColor: `${color}55`, backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` }}
            >
              {src ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={src} alt="" width={32} height={32} className="object-cover" />
              ) : (
                <Shield size={18} style={{ color }} />
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-semibold tracking-wider" style={{ color }}>
                장비 획득
              </span>
              <span className="truncate text-[12px] font-medium text-[var(--text-primary)]">
                {drop.displayName}
              </span>
              {rarity && (
                <span className="text-[10px]" style={{ color }}>
                  {rarity}
                </span>
              )}
            </div>
          </button>
        );
      })}
      {extra > 0 && (
        <div
          className={`pointer-events-auto rounded-lg border border-[var(--gold)]/40 bg-[var(--bg-card)] px-3 py-1 text-[10px] text-[var(--gold)] transition-opacity ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          외 {extra}개
        </div>
      )}
    </div>
  );
}
