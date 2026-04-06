"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";

interface PartyChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  sending?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export function PartyChatInput({
  onSend,
  disabled = false,
  sending = false,
  maxLength = 200,
  placeholder = "메시지를 입력하세요...",
}: PartyChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !disabled && !sending;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, onSend, text]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setText(value);
    }
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
  }

  return (
    <div className="flex items-end gap-2 border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-2">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="min-h-[36px] max-h-[80px] flex-1 resize-none rounded-md border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] focus:outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
          canSend
            ? "bg-[var(--gold)] text-[var(--bg-primary)] hover:bg-[var(--gold)]/90"
            : "bg-[var(--border-primary)] text-[var(--text-muted)]"
        }`}
      >
        {sending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
      </button>
    </div>
  );
}
