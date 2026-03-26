"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

/** HUB 노드는 선택지만 사용 — 텍스트 입력 숨김 */
function shouldHideTextInput(nodeType: string | null): boolean {
  return nodeType === "HUB";
}

interface InputSectionProps {
  onSubmit?: (text: string) => void;
  onQuickAction?: (actionId: string) => void;
  nodeType?: string | null;
  disabled?: boolean;
}

export function InputSection({ onSubmit, nodeType, disabled }: InputSectionProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit?.(text.trim());
      setText("");
    }
  };

  const hideInput = shouldHideTextInput(nodeType ?? null);
  if (hideInput) return null;

  return (
    <div className="flex w-full flex-col gap-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
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
    </div>
  );
}

export function MobileInputSection({
  onSubmit,
  nodeType,
  disabled,
}: InputSectionProps) {
  const [text, setText] = useState("");
  const hideInput = shouldHideTextInput(nodeType ?? null);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit?.(text.trim());
      setText("");
    }
  };

  if (hideInput) return null;

  return (
    <div className="sticky bottom-0 z-30 flex w-full flex-col gap-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={disabled ? "처리 중..." : "행동을 입력하세요..."}
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
    </div>
  );
}
