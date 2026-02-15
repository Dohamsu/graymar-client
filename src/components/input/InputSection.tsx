"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { QuickActionButton } from "./QuickActionButton";
import type { QuickAction } from "@/types/game";

const COMBAT_ACTIONS: QuickAction[] = [
  { id: "attack", label: "공격", icon: "sword", color: "var(--hp-red)" },
  { id: "defend", label: "방어", icon: "shield", color: "var(--info-blue)" },
  { id: "evade", label: "회피", icon: "footprints", color: "var(--success-green)" },
  { id: "flee", label: "도주", icon: "door-open", color: "var(--gold)" },
  { id: "use-item", label: "아이템 사용", icon: "package", color: "var(--orange)" },
];

const EVENT_ACTIONS: QuickAction[] = [
  { id: "observe", label: "관찰", icon: "eye", color: "var(--info-blue)" },
  { id: "talk", label: "대화", icon: "message-circle", color: "var(--purple)" },
  { id: "search", label: "탐색", icon: "search", color: "var(--success-green)" },
];

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: "observe", label: "관찰", icon: "eye", color: "var(--info-blue)" },
  { id: "talk", label: "대화", icon: "message-circle", color: "var(--purple)" },
];

function getQuickActions(nodeType: string | null): QuickAction[] {
  switch (nodeType) {
    case "COMBAT":
      return COMBAT_ACTIONS;
    case "EVENT":
      return EVENT_ACTIONS;
    case "REST":
    case "SHOP":
    case "EXIT":
      return [];
    default:
      return DEFAULT_ACTIONS;
  }
}

interface InputSectionProps {
  onSubmit?: (text: string) => void;
  onQuickAction?: (actionId: string) => void;
  nodeType?: string | null;
  disabled?: boolean;
}

export function InputSection({ onSubmit, onQuickAction, nodeType, disabled }: InputSectionProps) {
  const [text, setText] = useState("");
  const quickActions = getQuickActions(nodeType ?? null);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
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
          placeholder={
            nodeType === "COMBAT"
              ? "전투 행동을 입력하세요..."
              : "행동을 입력하세요..."
          }
          disabled={disabled}
          className="h-12 flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex h-12 items-center gap-2 rounded-lg bg-[var(--gold)] px-6 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 size={16} className="animate-spin text-[var(--bg-secondary)]" />
          ) : (
            <Play size={16} className="text-[var(--bg-secondary)]" />
          )}
          <span className="text-sm font-semibold text-[var(--bg-secondary)]">
            {disabled ? "처리 중..." : "실행"}
          </span>
        </button>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <QuickActionButton
              key={action.id}
              label={action.label}
              icon={action.icon}
              color={action.color}
              onClick={() => onQuickAction?.(action.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileInputSection({
  onSubmit,
  onQuickAction,
  nodeType,
  disabled,
}: InputSectionProps) {
  const [text, setText] = useState("");
  const quickActions = getQuickActions(nodeType ?? null);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
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
          placeholder="행동을 입력하세요..."
          disabled={disabled}
          className="h-11 flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--gold)] disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 size={16} className="animate-spin text-[var(--bg-secondary)]" />
          ) : (
            <Play size={16} className="text-[var(--bg-secondary)]" />
          )}
        </button>
      </div>
      {quickActions.length > 0 && (
        <div className="flex gap-1.5">
          {quickActions.slice(0, 4).map((action) => (
            <button
              key={action.id}
              onClick={() => onQuickAction?.(action.id)}
              disabled={disabled}
              className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-[var(--border-primary)] disabled:opacity-50"
              style={{ border: `1px solid ${action.color}40` }}
            >
              <span
                className="text-[11px] font-medium"
                style={{ color: action.color }}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
