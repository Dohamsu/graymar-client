"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, RefreshCw, SkipForward } from "lucide-react";
import { useGameStore } from "@/store/game-store";

export function LlmFailureModal() {
  const llmFailure = useGameStore((s) => s.llmFailure);
  const dismiss = useGameStore((s) => s.dismissLlmFailure);
  const retry = useGameStore((s) => s.retryLlmNarrative);
  const skip = useGameStore((s) => s.skipLlmNarrative);
  const [retrying, setRetrying] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  // Focus first button on mount
  useEffect(() => {
    if (llmFailure) {
      firstBtnRef.current?.focus();
    }
  }, [llmFailure]);

  // Focus trap within modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [dismiss]
  );

  if (!llmFailure) return null;

  const handleRetry = async () => {
    setRetrying(true);
    await retry();
    setRetrying(false);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="llm-fail-title"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        className="mx-4 w-full max-w-sm rounded-lg border border-[var(--hp-red)]/30 bg-[var(--bg-primary)] p-6 shadow-2xl shadow-black/50"
      >
        {/* Icon + Title */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--hp-red)]/15">
            <AlertTriangle size={20} className="text-[var(--hp-red)]" />
          </div>
          <h3
            id="llm-fail-title"
            className="text-base font-bold text-[var(--text-primary)]"
          >
            AI 서술 생성 실패
          </h3>
        </div>

        {/* Error message */}
        <div className="mb-4 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {llmFailure.message}
          </p>
          {llmFailure.provider && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Provider: {llmFailure.provider}
            </p>
          )}
        </div>

        {/* Guide */}
        <p className="mb-5 text-xs leading-relaxed text-[var(--text-secondary)]">
          재시도하거나, 서술을 건너뛰고 게임을 계속할 수 있습니다.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            ref={firstBtnRef}
            onClick={handleRetry}
            disabled={retrying}
            aria-label="AI 서술 재시도"
            className="flex w-full items-center justify-center gap-2 rounded bg-[var(--info-blue)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <RefreshCw size={14} className={retrying ? "animate-spin" : ""} />
            {retrying ? "재시도 중..." : "재시도"}
          </button>
          <button
            onClick={skip}
            aria-label="서술 건너뛰기"
            className="flex w-full items-center justify-center gap-2 rounded border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <SkipForward size={14} />
            서술 건너뛰기
          </button>
          <button
            onClick={dismiss}
            aria-label="모달 닫기"
            className="mt-1 w-full rounded px-4 py-2 text-xs text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
