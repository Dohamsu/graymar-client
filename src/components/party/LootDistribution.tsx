"use client";

import { useState } from "react";
import { Dice6, Coins, Trophy, X } from "lucide-react";

interface LootRoll {
  userId: string;
  nickname: string;
  roll: number;
}

interface LootResultItem {
  itemId: string;
  itemName: string;
  winnerId: string;
  winnerNickname: string;
  rolls: LootRoll[];
}

interface GoldResultItem {
  userId: string;
  nickname: string;
  amount: number;
}

interface LootDistributionProps {
  lootResults: LootResultItem[];
  goldResults: GoldResultItem[];
  totalGold: number;
  onClose: () => void;
}

export function LootDistribution({
  lootResults,
  goldResults,
  totalGold,
  onClose,
}: LootDistributionProps) {
  const [activeTab, setActiveTab] = useState<"loot" | "gold">(
    lootResults.length > 0 ? "loot" : "gold",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--gold)]/30 bg-[var(--bg-secondary)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-[var(--gold)]" />
            <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
              보상 분배
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-primary)]">
          {lootResults.length > 0 && (
            <button
              onClick={() => setActiveTab("loot")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "loot"
                  ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Dice6 size={14} className="mr-1.5 inline-block" />
              아이템 ({lootResults.length})
            </button>
          )}
          {goldResults.length > 0 && (
            <button
              onClick={() => setActiveTab("gold")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "gold"
                  ? "border-b-2 border-[var(--gold)] text-[var(--gold)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Coins size={14} className="mr-1.5 inline-block" />
              골드 ({totalGold}G)
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto p-4">
          {activeTab === "loot" &&
            lootResults.map((item) => (
              <div
                key={item.itemId}
                className="mb-3 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 last:mb-0"
              >
                <div className="mb-2 font-medium text-[var(--text-primary)]">
                  {item.itemName}
                </div>
                <div className="space-y-1">
                  {item.rolls.map((r) => (
                    <div
                      key={r.userId}
                      className={`flex items-center justify-between text-sm ${
                        r.userId === item.winnerId
                          ? "font-medium text-[var(--gold)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      <span>
                        {r.userId === item.winnerId && "🏆 "}
                        {r.nickname}
                      </span>
                      <span className="font-mono">
                        🎲 {r.roll}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {activeTab === "gold" && (
            <div className="space-y-2">
              {goldResults.map((g) => (
                <div
                  key={g.userId}
                  className="flex items-center justify-between rounded-md bg-[var(--bg-primary)] px-3 py-2.5"
                >
                  <span className="text-sm text-[var(--text-primary)]">
                    {g.nickname}
                  </span>
                  <span className="text-sm font-medium text-[var(--gold)]">
                    +{g.amount}G
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-primary)] px-5 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-[var(--gold)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-colors hover:bg-[var(--gold)]/90"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
