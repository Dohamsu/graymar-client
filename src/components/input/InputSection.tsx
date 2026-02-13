"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { QuickActionButton } from "./QuickActionButton";
import type { QuickAction } from "@/types/game";

const QUICK_ACTIONS: QuickAction[] = [
  { id: "attack", label: "Attack", icon: "sword", color: "var(--hp-red)" },
  { id: "observe", label: "Observe", icon: "eye", color: "var(--info-blue)" },
  { id: "move", label: "Move", icon: "footprints", color: "var(--success-green)" },
  { id: "rest", label: "Rest", icon: "bed-single", color: "var(--gold)" },
  { id: "talk", label: "Talk", icon: "message-circle", color: "var(--purple)" },
  { id: "use-item", label: "Use Item", icon: "package", color: "var(--orange)" },
];

interface InputSectionProps {
  onSubmit?: (text: string) => void;
  onQuickAction?: (actionId: string) => void;
}

export function InputSection({ onSubmit, onQuickAction }: InputSectionProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit?.(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex w-full flex-col gap-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
      {/* Input Row */}
      <div className="flex w-full items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Describe your action..."
          className="h-12 flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--gold)]"
        />
        <button
          onClick={handleSubmit}
          className="flex h-12 items-center gap-2 rounded-lg bg-[var(--gold)] px-6 transition-opacity hover:opacity-90"
        >
          <Play size={16} className="text-[var(--bg-secondary)]" />
          <span className="text-sm font-semibold text-[var(--bg-secondary)]">
            Execute Action
          </span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionButton
            key={action.id}
            label={action.label}
            icon={action.icon}
            color={action.color}
            onClick={() => onQuickAction?.(action.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function MobileInputSection({ onSubmit, onQuickAction }: InputSectionProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit?.(text.trim());
      setText("");
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Describe your action..."
          className="h-11 flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          onClick={handleSubmit}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--gold)]"
        >
          <Play size={16} className="text-[var(--bg-secondary)]" />
        </button>
      </div>
      <div className="flex gap-1.5">
        {QUICK_ACTIONS.slice(0, 4).map((action) => (
          <button
            key={action.id}
            onClick={() => onQuickAction?.(action.id)}
            className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-[var(--border-primary)]"
            style={{ border: `1px solid ${action.color}40` }}
          >
            <span className="text-[11px] font-medium" style={{ color: action.color }}>
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
