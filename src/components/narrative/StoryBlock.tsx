import { useState, useEffect, useRef, useMemo } from "react";
import type { StoryMessage } from "@/types/game";
import { ResolveOutcomeInline } from "@/components/hub/ResolveOutcomeBanner";
import { useSettingsStore, TEXT_SPEED_PRESETS } from "@/store/settings-store";

const LOADING_MESSAGES = [
  "서술 생성 중...",
  "이야기를 짜는 중...",
  "당신의 운명을 엮는 중...",
  "세계를 구축하는 중...",
  "장면을 그리는 중...",
  "등장인물이 준비하는 중...",
  "사건의 실마리를 잇는 중...",
  "분위기를 조성하는 중...",
];

const LABEL_COLORS: Record<string, string> = {
  SYSTEM: "var(--gold)",
  NARRATOR: "var(--success-green)",
  PLAYER: "var(--text-secondary)",
  CHOICE: "var(--info-blue)",
};

const LABEL_TEXT: Record<string, string> = {
  SYSTEM: "시스템",
  NARRATOR: "내레이터",
  PLAYER: "행동",
  CHOICE: "무엇을 하겠는가?",
};

interface StoryBlockProps {
  message: StoryMessage;
  onChoiceSelect?: (choiceId: string) => void;
  onNarrationComplete?: () => void;
}

function NarratorLoading() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--success-green)] opacity-60" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--success-green)] opacity-60" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--success-green)] opacity-60" style={{ animationDelay: "300ms" }} />
      </div>
      <span
        className="text-sm text-[var(--text-muted)] transition-opacity duration-500"
        key={msgIndex}
      >
        {LOADING_MESSAGES[msgIndex]}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 대사 스타일링 — "" / "" 안의 텍스트를 다른 색상·폰트로 렌더
// ---------------------------------------------------------------------------

function renderStyledText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // 큰따옴표 = 대사(블록), 작은따옴표 = 강조(인라인)
  const regex = /("[^"]*"?|\u201C[^\u201D]*\u201D?|'[^']*'?|\u2018[^\u2019]*\u2019?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    const ch = match[0][0];
    const isDialogue = ch === '"' || ch === '\u201C';

    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(
      <span
        key={key++}
        className={isDialogue ? "block my-6 font-dialogue" : "font-dialogue"}
        style={{ color: "var(--gold)" }}
      >
        {match[0]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// NarratorContent — 문단 간격 + 대사 스타일링
// ---------------------------------------------------------------------------

function NarratorContent({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) =>
        line === "" ? (
          // 빈 줄 = 문단 구분 간격
          <span key={i} className="block h-3" aria-hidden="true" />
        ) : (
          <span key={i} className="block">
            {renderStyledText(line)}
          </span>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// TypewriterText — 글자 단위 타이핑 + 문단 경계 숨 쉬기 + 대사/문단 스타일
// ---------------------------------------------------------------------------

function findParagraphBreaks(text: string): Set<number> {
  const breaks = new Set<number>();
  const re = /\n\n*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    breaks.add(m.index + m[0].length);
  }
  return breaks;
}

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const textSpeed = useSettingsStore((s) => s.textSpeed);
  const preset = TEXT_SPEED_PRESETS[textSpeed];

  const [displayLen, setDisplayLen] = useState(0);
  const [prevText, setPrevText] = useState(text);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  const breaks = useMemo(() => findParagraphBreaks(text), [text]);

  // text 변경 시 displayLen 리셋 (derived state 패턴)
  if (text !== prevText) {
    setPrevText(text);
    setDisplayLen(0);
  }

  useEffect(() => {
    if (displayLen >= text.length) {
      onCompleteRef.current?.();
      return;
    }
    // 즉시 모드: 한번에 전부 표시
    if (preset.charSpeed === 0) {
      setDisplayLen(text.length);
      return;
    }
    const delay = breaks.has(displayLen) ? preset.paragraphPause : preset.charSpeed;
    const timer = setTimeout(() => {
      setDisplayLen((prev) => Math.min(prev + 1, text.length));
    }, delay);
    return () => clearTimeout(timer);
  }, [displayLen, text, breaks, preset]);

  return (
    <>
      <NarratorContent text={text.slice(0, displayLen)} />
      {displayLen < text.length && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--success-green)] align-text-bottom" />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// StoryBlock
// ---------------------------------------------------------------------------

export function StoryBlock({ message, onChoiceSelect, onNarrationComplete }: StoryBlockProps) {
  // RESOLVE 타입: 주사위 애니메이션 → 판정 결과 공개 (별도 블록)
  if (message.type === "RESOLVE" && message.resolveOutcome) {
    return <ResolveOutcomeInline outcome={message.resolveOutcome} />;
  }

  const labelColor = LABEL_COLORS[message.type] ?? "var(--text-muted)";
  const isPlayer = message.type === "PLAYER";
  const isNarrator = message.type === "NARRATOR";
  const borderColor = isPlayer ? "var(--gold)" : "var(--border-primary)";
  const bgColor = message.type === "CHOICE" || isPlayer ? "var(--bg-secondary)" : "var(--bg-card)";

  // NARRATOR가 loading → 텍스트로 전환될 때 타이핑 애니메이션 트리거 (derived state 패턴)
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevLoading, setPrevLoading] = useState(message.loading);
  const [wasLoading, setWasLoading] = useState(!!message.loading);

  if (prevLoading !== message.loading) {
    setPrevLoading(message.loading);
    if (message.loading) {
      setWasLoading(true);
    } else if (wasLoading && isNarrator && message.text) {
      setWasLoading(false);
      setShouldAnimate(true);
    }
  }

  const isNarratorTypewriting = isNarrator && shouldAnimate && !message.loading;

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-none p-4"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${isPlayer ? `${borderColor}30` : borderColor}`,
      }}
    >
      <span
        className="text-[11px] font-semibold tracking-[1px]"
        style={{ color: labelColor }}
      >
        {LABEL_TEXT[message.type]}
      </span>

      {message.loading ? (
        <NarratorLoading />
      ) : message.type === "CHOICE" && message.choices ? (
        <div className="flex flex-col gap-1">
          {message.selectedChoiceId ? (
            (() => {
              const selected = message.choices.find(
                (c) => c.id === message.selectedChoiceId,
              );
              if (!selected) return null;
              const idx = message.choices.indexOf(selected);
              return (
                <div
                  className="rounded-md px-3 py-2 font-display text-base leading-[1.6]"
                  style={{
                    color: "var(--gold)",
                    opacity: 0.7,
                  }}
                >
                  {idx + 1}. {selected.label}
                </div>
              );
            })()
          ) : (
            message.choices.map((choice, i) => (
              <button
                key={choice.id}
                onClick={() => onChoiceSelect?.(choice.id)}
                className="choice-btn cursor-pointer rounded-md px-3 py-2 text-left font-display text-base leading-[1.6]"
                style={{
                  color: choice.disabled
                    ? "var(--text-secondary)"
                    : "var(--text-primary)",
                }}
              >
                {i + 1}. {choice.label}
              </button>
            ))
          )}
        </div>
      ) : isNarrator ? (
        /* ── 내레이터: 대사 스타일 + 문단 간격 ── */
        <div
          className="font-narrative text-[17px] leading-[1.75]"
          style={{ color: "var(--text-primary)" }}
        >
          {isNarratorTypewriting ? (
            <TypewriterText
              text={message.text}
              onComplete={() => {
                setShouldAnimate(false);
                onNarrationComplete?.();
              }}
            />
          ) : (
            <NarratorContent text={message.text} />
          )}
        </div>
      ) : (
        /* ── 일반 메시지 (PLAYER, SYSTEM) ── */
        <p
          className={`text-[17px] leading-[1.75] whitespace-pre-line ${
            isPlayer ? "font-ui italic" : "font-narrative"
          }`}
          style={{
            color: isPlayer ? "var(--text-secondary)" : "var(--text-primary)",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
