"use client";

import { useState, useCallback } from "react";
import { CharacterTab } from "./CharacterTab";
import { InventoryTab } from "./InventoryTab";
import type { CharacterInfo, InventoryItem, InventoryChanges } from "@/types/game";

const TABS = ["캐릭터", "소지품", "퀘스트"] as const;

interface SidePanelProps {
  character: CharacterInfo;
  inventory: InventoryItem[];
  gold: number;
  inventoryChanges?: InventoryChanges | null;
  onClearChanges?: () => void;
}

export function SidePanel({ character, inventory, gold, inventoryChanges, onClearChanges }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<string>("캐릭터");

  const hasChanges = !!inventoryChanges;

  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
    // "소지품" 탭 진입 시 5초 후 하이라이트 제거
    if (tab === "소지품" && hasChanges && onClearChanges) {
      setTimeout(onClearChanges, 5000);
    }
  }, [hasChanges, onClearChanges]);

  return (
    <div className="flex h-full w-[420px] flex-col border-l border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      {/* Tab Header */}
      <div className="flex h-12 w-full items-center border-b border-[var(--border-primary)] px-4">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          const showBadge = tab === "소지품" && hasChanges && activeTab !== "소지품";
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
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "캐릭터" && <CharacterTab character={character} />}
        {activeTab === "소지품" && (
          <InventoryTab inventory={inventory} gold={gold} changes={inventoryChanges} />
        )}
        {activeTab === "퀘스트" && (
          <p className="text-sm text-[var(--text-muted)]">퀘스트 기록 준비 중...</p>
        )}
      </div>
    </div>
  );
}
