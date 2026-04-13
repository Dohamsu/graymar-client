"use client";

import { useEffect, useState } from "react";
import type { SignalFeedItemUI } from "@/types/game";

interface Props {
  signals: SignalFeedItemUI[];
  onClose: () => void;
}

const CHANNEL_ICON: Record<string, string> = {
  RUMOR: "🗣",
  SECURITY: "🛡",
  NPC_BEHAVIOR: "👤",
  ECONOMY: "💰",
  VISUAL: "👁",
};

const SEVERITY_STYLE: Record<number, string> = {
  1: "text-[var(--text-secondary)]",
  2: "text-[var(--text-secondary)]",
  3: "text-[var(--gold)]",
  4: "text-[var(--orange)]",
  5: "text-[var(--hp-red)]",
};

export default function NewsModal({ signals, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/70" />

      {/* 신문 카드 */}
      <div
        className={`relative mx-4 w-full max-w-sm transform transition-transform duration-300 ${
          visible ? "scale-100" : "scale-90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-lg border border-[var(--gold)]/50 bg-[#1a1714]">
          {/* 헤더: 신문 타이틀 */}
          <div className="border-b border-[var(--gold)]/30 px-5 py-4 text-center">
            <div className="mb-1 text-[10px] tracking-[0.3em] text-[var(--text-muted)] uppercase">
              GRAYMAR TIMES
            </div>
            <h2
              className="font-serif text-xl font-bold tracking-wider text-[var(--gold)]"
              style={{ fontFamily: "'Noto Serif KR', serif" }}
            >
              그레이마르 호외
            </h2>
            <div className="mt-1 h-px bg-[var(--gold)]/30" />
            <div className="mt-1 h-px bg-[var(--gold)]/30" />
          </div>

          {/* 기사 목록 */}
          <div className="space-y-0 divide-y divide-[var(--border-primary)]/50 px-5 py-3">
            {signals.map((signal, i) => (
              <div key={signal.id ?? i} className="py-3 first:pt-1 last:pb-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-xs">{CHANNEL_ICON[signal.channel] ?? "📰"}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      SEVERITY_STYLE[signal.severity] ?? ""
                    }`}
                  >
                    {signal.channel === "RUMOR" && "소문"}
                    {signal.channel === "SECURITY" && "치안"}
                    {signal.channel === "NPC_BEHAVIOR" && "인물 동향"}
                    {signal.channel === "ECONOMY" && "경제"}
                    {signal.channel === "VISUAL" && "목격담"}
                  </span>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: signal.severity >= 4 ? "var(--gold)" : "var(--text-primary)",
                    fontFamily: "'Noto Serif KR', serif",
                  }}
                >
                  {signal.text}
                </p>
              </div>
            ))}
          </div>

          {/* 푸터 */}
          <div className="border-t border-[var(--gold)]/30 px-5 py-3 text-center">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--gold)]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
