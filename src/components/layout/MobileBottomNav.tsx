"use client";

import { BookOpen, User, Backpack, ScrollText } from "lucide-react";

const NAV_ITEMS = [
  { id: "story", label: "이야기", icon: BookOpen },
  { id: "character", label: "캐릭터", icon: User },
  { id: "inventory", label: "소지품", icon: Backpack },
  { id: "quests", label: "퀘스트", icon: ScrollText },
] as const;

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="flex h-16 w-full items-center justify-around border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] pt-2">
      {NAV_ITEMS.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className="flex flex-col items-center gap-1"
          >
            <item.icon
              size={20}
              className={active ? "text-[var(--gold)]" : "text-[var(--text-muted)]"}
            />
            <span
              className={`text-[10px] ${
                active
                  ? "font-semibold text-[var(--gold)]"
                  : "font-medium text-[var(--text-muted)]"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
