"use client";
// [arch/77 P5a] 캐릭터 생성 스텝 레이아웃 + 인디케이터 — StartScreen.tsx에서 분리.
import { ChevronLeft } from "lucide-react";

const STEP_LABELS = ["출신", "초상화", "이름", "스탯", "특성", "확인"];

export function StepIndicator({
  current,
  total,
  labels = STEP_LABELS,
}: {
  current: number;
  total: number;
  labels?: string[];
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className={`h-1.5 rounded-full transition-all ${
              i < current
                ? "w-6 bg-[var(--gold)]"
                : i === current
                  ? "w-6 bg-[var(--gold)] opacity-60"
                  : "w-4 bg-[var(--border-primary)]"
            }`}
          />
          <span className={`text-[9px] leading-none ${
            i <= current ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
          }`}>
            {labels[i] ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creation step layout wrapper
// ---------------------------------------------------------------------------

export function CreationLayout({
  title,
  step,
  totalSteps,
  stepLabels,
  onBack,
  children,
  footer,
}: {
  title: string;
  step: number;
  totalSteps: number;
  stepLabels?: string[];
  onBack: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center gap-4 border-b border-[var(--border-primary)] px-4 py-3 sm:px-6">
        <button
          onClick={onBack}
          className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={18} className="inline" /> 뒤로
        </button>
        <h2 className="flex-1 font-display text-base text-[var(--text-primary)]">{title}</h2>
        <StepIndicator current={step} total={totalSteps} labels={stepLabels} />
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto px-4 pt-6 sm:px-6 ${footer ? "pb-28" : "pb-6"}`}>
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
      {footer && (
        <div className="shrink-0 border-t border-[var(--border-primary)] px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">{footer}</div>
        </div>
      )}
    </div>
  );
}
