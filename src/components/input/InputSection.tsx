"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { Play, Loader2, MapPin, Sparkles, X } from "lucide-react";

/** HUB 노드는 선택지만 사용 — 텍스트 입력 숨김 */
function shouldHideTextInput(nodeType: string | null): boolean {
  return nodeType === "HUB";
}

// ---------------------------------------------------------------------------
// 자유 입력 발견성 (arch/68 부록 C)
// 신규 플레이어가 "선택지 클릭 게임"으로 오해하지 않도록:
// ① 첫 LOCATION 1회성 코치마크 ② placeholder 행동 예시 로테이션
// ---------------------------------------------------------------------------

const FREE_INPUT_HINT_KEY = "graymar:free-input-hint-v1";

/** LOCATION placeholder 예시 — 마운트당 1개 랜덤 (직접 입력 가능함을 상시 암시) */
const ACTION_PLACEHOLDER_EXAMPLES = [
  "원하는 행동을 입력하세요 — 예: 상인에게 소문을 묻는다",
  "원하는 행동을 입력하세요 — 예: 주변을 조용히 살핀다",
  "원하는 행동을 입력하세요 — 예: 수상한 자를 미행한다",
  "원하는 행동을 입력하세요 — 예: 구석 자리의 사내에게 말을 건다",
];

function pickActionPlaceholder(): string {
  const i = Math.floor(Math.random() * ACTION_PLACEHOLDER_EXAMPLES.length);
  return ACTION_PLACEHOLDER_EXAMPLES[i] ?? ACTION_PLACEHOLDER_EXAMPLES[0]!;
}

/* dismiss 상태 외부 스토어 — localStorage 원본 + 탭 내 구독자 동기화
   (useSyncExternalStore: effect 내 동기 setState 없이 SSR 안전 초기값) */
const hintListeners = new Set<() => void>();
function subscribeHint(cb: () => void) {
  hintListeners.add(cb);
  return () => hintListeners.delete(cb);
}
function readHintDismissed(): boolean {
  try {
    return !!localStorage.getItem(FREE_INPUT_HINT_KEY);
  } catch {
    return true; // 접근 불가 환경 — 힌트 생략
  }
}
function markHintDismissed() {
  try {
    localStorage.setItem(FREE_INPUT_HINT_KEY, "1");
  } catch {
    /* noop */
  }
  hintListeners.forEach((cb) => cb());
}

/** 첫 LOCATION 진입 1회 노출 여부 훅 — 포커스/닫기로 소멸, 서버 스냅샷은 숨김 */
function useFreeInputCoachmark(nodeType: string | null | undefined) {
  const dismissed = useSyncExternalStore(
    subscribeHint,
    readHintDismissed,
    () => true,
  );
  const dismiss = useCallback(() => markHintDismissed(), []);
  return { show: nodeType === "LOCATION" && !dismissed, dismiss };
}

/** 입력창 위 1회성 코치마크 */
function FreeInputCoachmark({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative rounded-md border border-[rgba(201,169,98,0.45)] bg-[rgba(201,169,98,0.08)] px-3 py-2.5 pr-9">
      <div className="flex items-start gap-2">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--gold)]" />
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--gold)]">선택지가 전부가 아닙니다.</span>{" "}
          하고 싶은 행동을 문장으로 직접 입력해 보세요 — 대화, 조사, 잠입, 거래 모두
          이야기에 반영됩니다.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="안내 닫기"
        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/** HUB 입력 안내 — 자유 행동은 장소에서 (arch/68 C-1) */
function HubInputNotice({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex w-full items-center justify-center gap-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] ${
        compact ? "p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" : "p-4"
      }`}
    >
      <MapPin size={13} className="shrink-0 text-[var(--text-muted)]" />
      <span className="text-xs text-[var(--text-muted)]">
        거점에서는 행선지를 선택하세요 — 대화와 행동은 장소에 들어가 자유롭게 입력할 수 있습니다
      </span>
    </div>
  );
}

interface InputSectionProps {
  onSubmit?: (text: string) => void;
  onQuickAction?: (actionId: string) => void;
  nodeType?: string | null;
  disabled?: boolean;
}

export function InputSection({ onSubmit, nodeType, disabled }: InputSectionProps) {
  const [text, setText] = useState("");
  const [placeholder] = useState(pickActionPlaceholder);
  const coachmark = useFreeInputCoachmark(nodeType);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit?.(text.trim());
      setText("");
    }
  };

  const hideInput = shouldHideTextInput(nodeType ?? null);
  if (hideInput) return <HubInputNotice />;

  return (
    <div className="flex w-full flex-col gap-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6">
      {coachmark.show && <FreeInputCoachmark onDismiss={coachmark.dismiss} />}
      <div className="flex w-full items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          onFocus={coachmark.show ? coachmark.dismiss : undefined}
          placeholder={
            nodeType === "COMBAT" ? "전투 행동을 입력하세요..." : placeholder
          }
          disabled={disabled}
          className="h-12 flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-4 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--gold)] disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex h-12 items-center gap-2 rounded-lg bg-[var(--gold)] px-6 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 size={16} className="animate-spin text-[var(--bg-secondary)]" />
          ) : (
            <Play size={16} className="text-[var(--bg-secondary)]" />
          )}
          <span className="text-sm font-semibold text-[var(--bg-secondary)]">
            {disabled ? "처리 중..." : "실행"}
          </span>
        </button>
      </div>
    </div>
  );
}

export function MobileInputSection({
  onSubmit,
  nodeType,
  disabled,
}: InputSectionProps) {
  const [text, setText] = useState("");
  const [placeholder] = useState(pickActionPlaceholder);
  const coachmark = useFreeInputCoachmark(nodeType);
  const hideInput = shouldHideTextInput(nodeType ?? null);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit?.(text.trim());
      setText("");
    }
  };

  if (hideInput) return <HubInputNotice compact />;

  return (
    <div className="sticky bottom-0 z-30 flex w-full flex-col gap-2.5 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {coachmark.show && <FreeInputCoachmark onDismiss={coachmark.dismiss} />}
      <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          onFocus={coachmark.show ? coachmark.dismiss : undefined}
          placeholder={disabled ? "처리 중..." : placeholder}
          disabled={disabled}
          className="h-11 flex-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--gold)] disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 size={16} className="animate-spin text-[var(--bg-secondary)]" />
          ) : (
            <Play size={16} className="text-[var(--bg-secondary)]" />
          )}
        </button>
      </div>
    </div>
  );
}
