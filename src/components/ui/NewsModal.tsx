"use client";

import { useEffect, useRef, useState } from "react";
import type { SignalFeedItemUI } from "@/types/game";

interface Props {
  signals: SignalFeedItemUI[];
  onClose: () => void;
}

export default function NewsModal({ signals, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  // P2-C1: close 애니메이션 setTimeout cleanup
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/80" />

      <div
        className={`relative mx-4 w-full max-w-sm transform transition-transform duration-300 ${
          visible ? "scale-100" : "scale-90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-hidden rounded"
          style={{
            backgroundImage: "url('/textures/parchment.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* 헤더 */}
          <div className="px-6 pt-6 pb-2 text-center">
            <div
              className="mb-1 text-[10px] font-semibold tracking-[0.3em] uppercase"
              style={{ color: "#d9cdb4", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
            >
              DIMTALE TIMES
            </div>
            <h2
              className="text-xl font-bold tracking-wider"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                color: "#f7f1e3",
                textShadow: "0 1px 3px rgba(0,0,0,0.85)",
              }}
            >
              그레이마르 호외
            </h2>
            <div
              className="mx-auto mt-2 h-[2px] w-full"
              style={{ background: "#cbbfa6", opacity: 0.7 }}
            />
            <div
              className="mx-auto mt-1 h-px w-3/4"
              style={{ background: "#cbbfa6", opacity: 0.4 }}
            />
          </div>

          {/* 기사 본문 */}
          <div className="px-6 py-4 space-y-3">
            {signals.map((signal, i) => (
              <p
                key={signal.id ?? i}
                className="text-sm leading-relaxed"
                style={{
                  color: "#eee4cf",
                  fontFamily: "'Noto Serif KR', serif",
                  textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                }}
              >
                {signal.text}
              </p>
            ))}
          </div>

          {/* 하단 여백 */}
          <div className="px-6 pb-5 text-center">
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#d9cdb4", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}
            >
              [ 닫기 ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
