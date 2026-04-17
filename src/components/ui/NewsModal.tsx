"use client";

import { useEffect, useState } from "react";
import type { SignalFeedItemUI } from "@/types/game";

interface Props {
  signals: SignalFeedItemUI[];
  onClose: () => void;
}

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
              className="mb-1 text-[10px] tracking-[0.3em] uppercase"
              style={{ color: "#5a4a35" }}
            >
              DIMTALE TIMES
            </div>
            <h2
              className="text-xl font-bold tracking-wider"
              style={{ fontFamily: "'Noto Serif KR', serif", color: "#2a1f14" }}
            >
              그레이마르 호외
            </h2>
            <div className="mx-auto mt-2 h-[2px] w-full" style={{ background: "#5a4a35" }} />
            <div className="mx-auto mt-1 h-px w-3/4" style={{ background: "#5a4a35", opacity: 0.5 }} />
          </div>

          {/* 기사 본문 */}
          <div className="px-6 py-4 space-y-3">
            {signals.map((signal, i) => (
              <p
                key={signal.id ?? i}
                className="text-sm leading-relaxed"
                style={{
                  color: "#2a1f14",
                  fontFamily: "'Noto Serif KR', serif",
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
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "#5a4a35" }}
            >
              [ 닫기 ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
