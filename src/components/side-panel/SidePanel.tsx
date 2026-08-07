"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { CharacterTab } from "./CharacterTab";
import { InventoryTab } from "./InventoryTab";
import { EquipmentTab } from "./EquipmentTab";
import { QuestTab } from "./QuestTab";
import { NpcDossierTab } from "./NpcDossierTab";
import type { CharacterInfo, InventoryItem, InventoryChanges } from "@/types/game";

const TABS = ["캐릭터", "장비", "소지품", "인물", "퀘스트"] as const;

interface SidePanelProps {
  character: CharacterInfo;
  inventory: InventoryItem[];
  gold: number;
  inventoryChanges?: InventoryChanges | null;
  onClearChanges?: () => void;
}

export function SidePanel({ character, inventory, gold, inventoryChanges, onClearChanges }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<string>("캐릭터");
  // P2-C1: setTimeout cleanup — 언마운트 시 leak 방지
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // 인물탭 배경 텍스처 웜업 (UIUX 점검 2026-08-07) — 탭이 전환마다 리마운트되고
  // 텍스처(각 ~280KB)가 CSS background라 우선순위가 없어, 첫 진입 시
  // "배경→테두리→초상화" 순차 노출이 보이던 것을 패널 마운트 시점 프리로드로 방지.
  useEffect(() => {
    for (const src of ["/textures/tavern-wall.webp", "/textures/wanted-poster.webp"]) {
      const img = new window.Image();
      img.src = src;
    }
  }, []);

  const hasChanges = !!inventoryChanges;
  // [arch/99] 퀘스트 탭 유도 배지 — 단서 발견·단계 전환 시 점등, 열람 시 해제
  const questTabBadge = useGameStore((s) => s.questTabBadge);
  const clearQuestTabBadge = useGameStore((s) => s.clearQuestTabBadge);

  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
    // "소지품" 탭 진입 시 5초 후 하이라이트 제거
    if (tab === "소지품" && hasChanges && onClearChanges) {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(onClearChanges, 5000);
    }
    if (tab === "퀘스트") clearQuestTabBadge();
  }, [hasChanges, onClearChanges, clearQuestTabBadge]);

  return (
    <div className="flex h-full w-[320px] flex-col border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] xl:w-[420px]">
      {/* Tab Header */}
      <div className="flex h-12 w-full items-center border-b border-[var(--border-primary)] px-4">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          const showBadge =
            (tab === "소지품" && hasChanges && activeTab !== "소지품") ||
            (tab === "퀘스트" && questTabBadge && activeTab !== "퀘스트");
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`relative flex h-full flex-1 items-center justify-center text-xs ${
                active
                  ? "border-b-2 border-[var(--gold)] font-semibold text-[var(--gold)]"
                  : "font-medium text-[var(--text-muted)]"
              }`}
            >
              {tab}
              {showBadge && (
                <span className="absolute -top-0.5 right-2 h-2 w-2 rounded-full bg-[var(--gold)] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-5">
        {activeTab === "캐릭터" && <CharacterTab character={character} />}
        {activeTab === "장비" && <EquipmentTab />}
        {activeTab === "소지품" && (
          <InventoryTab inventory={inventory} gold={gold} changes={inventoryChanges} />
        )}
        {activeTab === "인물" && <NpcDossierTab />}
        {activeTab === "퀘스트" && <QuestTab />}
      </div>
    </div>
  );
}
