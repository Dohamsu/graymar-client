"use client";

import { useState, useEffect, useRef } from "react";
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

/** Single die face component with rolling animation */
function DiceFace({ finalValue, delay }: { finalValue: number; delay: number }) {
  const [displayValue, setDisplayValue] = useState(1);
  const [isRolling, setIsRolling] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start rolling after delay
    const startTimer = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 80);

      // Stop rolling after 600ms
      setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayValue(finalValue);
        setIsRolling(false);
      }, 600);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [finalValue, delay]);

  const dots: Record<number, number[][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };

  const positions = dots[displayValue] ?? dots[1];

  return (
    <div
      className={`relative h-8 w-8 rounded-md border transition-all duration-300 ${
        isRolling
          ? "animate-pulse border-[var(--gold)]/50 bg-[var(--gold)]/10"
          : "border-[var(--border-primary)] bg-[var(--bg-primary)]"
      }`}
    >
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center p-1">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <div
              key={`${row}-${col}`}
              className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
                positions.some(([r, c]) => r === row && c === col)
                  ? "bg-[var(--text-primary)] opacity-100"
                  : "opacity-0"
              }`}
            />
          )),
        )}
      </div>
    </div>
  );
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
  const [revealedItems, setRevealedItems] = useState(0);

  // Reveal items one by one
  useEffect(() => {
    if (activeTab !== "loot") return;
    if (revealedItems >= lootResults.length) return;
    const timer = setTimeout(() => {
      setRevealedItems((n) => n + 1);
    }, 1200);
    return () => clearTimeout(timer);
  }, [revealedItems, lootResults.length, activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--gold)]/30 bg-[var(--bg-secondary)] shadow-xl animate-in fade-in zoom-in-95 duration-300">
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
            lootResults.map((item, idx) => (
              <div
                key={item.itemId}
                className={`mb-3 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 last:mb-0 transition-all duration-500 ${
                  idx < revealedItems
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
              >
                <div className="mb-2 font-medium text-[var(--text-primary)]">
                  {item.itemName}
                </div>
                <div className="space-y-1.5">
                  {item.rolls.map((r, rollIdx) => (
                    <div
                      key={r.userId}
                      className={`flex items-center justify-between text-sm ${
                        r.userId === item.winnerId
                          ? "font-medium text-[var(--gold)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {r.userId === item.winnerId && (
                          <span className="text-base">🏆</span>
                        )}
                        {r.nickname}
                      </span>
                      <div className="flex items-center gap-2">
                        {idx < revealedItems && (
                          <DiceFace
                            finalValue={r.roll}
                            delay={rollIdx * 200}
                          />
                        )}
                        <span className="w-4 text-center font-mono text-xs">
                          {idx < revealedItems ? r.roll : "?"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {activeTab === "gold" && (
            <div className="space-y-2">
              {goldResults.map((g, idx) => (
                <div
                  key={g.userId}
                  className="flex items-center justify-between rounded-md bg-[var(--bg-primary)] px-3 py-2.5 animate-in fade-in slide-in-from-right duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
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
