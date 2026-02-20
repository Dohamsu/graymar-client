"use client";

import { AlertTriangle } from "lucide-react";
import { useGameStore } from "@/store/game-store";

export function LlmFailureModal() {
  const llmFailure = useGameStore((s) => s.llmFailure);
  const dismiss = useGameStore((s) => s.dismissLlmFailure);

  if (!llmFailure) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-lg border border-[var(--hp-red)]/40 bg-[var(--panel-bg)] p-6 shadow-lg">
        {/* 아이콘 + 제목 */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--hp-red)]/20">
            <AlertTriangle size={20} className="text-[var(--hp-red)]" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            AI 서술 생성 실패
          </h3>
        </div>

        {/* 에러 메시지 */}
        <div className="mb-4 rounded border border-[var(--border-color)] bg-black/20 p-3">
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {llmFailure.message}
          </p>
          {llmFailure.provider && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Provider: {llmFailure.provider}
            </p>
          )}
        </div>

        {/* 안내 */}
        <p className="mb-5 text-xs leading-relaxed text-[var(--text-secondary)]">
          LLM API 설정을 확인해주세요. 설정 변경 후 게임을 다시 진행할 수 있습니다.
        </p>

        {/* 버튼 */}
        <button
          onClick={dismiss}
          className="w-full rounded bg-[var(--hp-red)]/80 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--hp-red)]"
        >
          확인
        </button>
      </div>
    </div>
  );
}
