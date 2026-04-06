"use client";

import { useEffect, useRef } from "react";

// ── Types ──

interface ChatMessage {
  id: string;
  type: "TEXT" | "SYSTEM" | "GAME_EVENT";
  senderNickname?: string;
  senderId?: string;
  text: string;
  timestamp: number;
}

interface PartyChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  className?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function PartyChatWindow({
  messages,
  currentUserId,
  className = "",
}: PartyChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto space-y-1.5 ${className}`}
    >
      {messages.length === 0 && (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">
          아직 메시지가 없습니다
        </p>
      )}

      {messages.map((msg) => {
        // ── SYSTEM message ──
        if (msg.type === "SYSTEM") {
          return (
            <div key={msg.id} className="px-2 py-1 text-center">
              <span className="text-[11px] italic text-[var(--text-muted)]">
                {msg.text}
              </span>
            </div>
          );
        }

        // ── GAME_EVENT message ──
        if (msg.type === "GAME_EVENT") {
          return (
            <div
              key={msg.id}
              className="mx-2 rounded-md border border-[var(--gold)]/20 bg-[var(--gold)]/5 px-3 py-2"
            >
              <span className="text-[11px] font-medium text-[var(--gold)]">
                {msg.text}
              </span>
            </div>
          );
        }

        // ── TEXT message ──
        const isMine = msg.senderId === currentUserId;

        return (
          <div
            key={msg.id}
            className={`flex flex-col px-2 ${isMine ? "items-end" : "items-start"}`}
          >
            {/* Sender name (not for own messages) */}
            {!isMine && msg.senderNickname && (
              <span className="mb-0.5 text-[10px] font-medium text-[var(--gold)]">
                {msg.senderNickname}
              </span>
            )}

            <div className={`flex items-end gap-1.5 ${isMine ? "flex-row-reverse" : ""}`}>
              {/* Bubble */}
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                  isMine
                    ? "bg-[var(--gold)]/15 text-[var(--text-primary)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              </div>

              {/* Timestamp */}
              <span className="shrink-0 text-[9px] text-[var(--text-muted)]">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
