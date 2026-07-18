"use client";
// [arch/77 P5a] 초상화 생성 로딩 오버레이 — StartScreen.tsx에서 분리.
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

// --- Portrait loading overlay with rotating messages + progress ---
const PORTRAIT_LOADING_MSGS = [
  "초상화를 그리는 중...",
  "붓에 잉크를 묻히는 중...",
  "얼굴의 윤곽을 잡는 중...",
  "눈빛에 깊이를 더하는 중...",
  "그림자를 입히는 중...",
  "마지막 세부 묘사 중...",
];

export function PortraitLoadingOverlay() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % PORTRAIT_LOADING_MSGS.length);
    }, 3000);
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 90));
    }, 500);
    return () => { clearInterval(msgTimer); clearInterval(progressTimer); };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
      <div className="flex flex-col items-center gap-4 px-6">
        <Loader2 size={36} className="animate-spin text-[var(--gold)]" />
        <span className="text-sm text-[var(--text-primary)] animate-pulse">
          {PORTRAIT_LOADING_MSGS[msgIdx]}
        </span>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full bg-[var(--gold)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
