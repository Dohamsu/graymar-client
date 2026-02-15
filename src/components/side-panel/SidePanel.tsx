"use client";

import { useState } from "react";
import { CharacterTab } from "./CharacterTab";
import type { CharacterInfo } from "@/types/game";

const TABS = ["캐릭터", "소지품", "퀘스트"] as const;

interface SidePanelProps {
  character: CharacterInfo;
}

export function SidePanel({ character }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<string>("캐릭터");

  return (
    <div className="flex h-full w-[420px] flex-col border-l border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      {/* Tab Header */}
      <div className="flex h-12 w-full items-center border-b border-[var(--border-primary)] px-4">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex h-full flex-1 items-center justify-center text-xs ${
                active
                  ? "border-b-2 border-[var(--gold)] font-semibold text-[var(--gold)]"
                  : "font-medium text-[var(--text-muted)]"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "캐릭터" && <CharacterTab character={character} />}
        {activeTab === "소지품" && (
          <p className="text-sm text-[var(--text-muted)]">소지품 기능 준비 중...</p>
        )}
        {activeTab === "퀘스트" && (
          <p className="text-sm text-[var(--text-muted)]">퀘스트 기록 준비 중...</p>
        )}
      </div>
    </div>
  );
}
