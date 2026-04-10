"use client";

import { useState, useEffect } from "react";

/**
 * SplashScreen — 게임 로딩 시 DimTale 활자 애니메이션
 * LOADING phase에서 표시, 데이터 로드 완료 시 페이드아웃
 */
export default function SplashScreen({ exiting = false }: { exiting?: boolean }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (exiting) {
      // 페이드아웃 후 DOM에서 제거
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [exiting]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)]"
      style={{
        transition: "opacity 0.5s ease-out",
        opacity: exiting ? 0 : 1,
      }}
    >
      {/* 메인 타이틀 — 글자별 순차 페이드인 */}
      <div className="mb-4 flex items-baseline gap-[2px]">
        {"DimTale".split("").map((char, i) => (
          <span
            key={i}
            className="font-display text-4xl font-bold tracking-wider text-[var(--gold)] opacity-0 md:text-5xl"
            style={{
              animation: `splashCharIn 0.5s ease-out ${i * 0.08}s forwards`,
            }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* 서브타이틀 */}
      <p
        className="mb-8 text-sm tracking-[0.3em] text-[var(--text-muted)] opacity-0"
        style={{ animation: "splashFadeIn 0.6s ease-out 0.7s forwards" }}
      >
        AI TEXT RPG
      </p>

      {/* 로딩 인디케이터 — 검 아이콘 + 펄스 라인 */}
      <div
        className="flex items-center gap-3 opacity-0"
        style={{ animation: "splashFadeIn 0.5s ease-out 1.0s forwards" }}
      >
        <div className="h-[1px] w-8 bg-[var(--gold)]/30" />
        <div
          className="text-lg text-[var(--gold)]/60"
          style={{ animation: "splashPulse 1.5s ease-in-out infinite" }}
        >
          ⚔
        </div>
        <div className="h-[1px] w-8 bg-[var(--gold)]/30" />
      </div>

      {/* 하단 텍스트 */}
      <p
        className="absolute bottom-12 text-xs text-[var(--text-muted)]/40 opacity-0"
        style={{ animation: "splashFadeIn 0.5s ease-out 1.2s forwards" }}
      >
        당신의 선택이 이야기를 만든다
      </p>

      <style jsx>{`
        @keyframes splashCharIn {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.8);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes splashFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes splashPulse {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
