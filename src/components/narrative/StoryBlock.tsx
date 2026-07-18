import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import type { StoryMessage } from "@/types/game";
import { ResolveOutcomeInline } from "@/components/hub/ResolveOutcomeBanner";
import { useSettingsStore, TEXT_SPEED_PRESETS, FONT_SIZE_PRESETS, getTypingDelay } from "@/store/settings-store";
import { STAT_COLORS, STAT_KOREAN_NAMES } from "@/data/stat-descriptions";
import { useGameStore } from "@/store/game-store";
import { DialogueBubble } from "./DialogueBubble";
import { StreamingBlock } from "./StreamingBlock";
import { uiLog } from "@/lib/ui-logger";

type SpeakingNpc = NonNullable<StoryMessage['speakingNpc']>;

/** Affordance → 스탯 키 매핑 (서버 resolve.service.ts 와 동기화) */
const AFFORDANCE_TO_STAT: Record<string, string> = {
  FIGHT: 'str', THREATEN: 'str',
  SNEAK: 'dex', STEAL: 'dex',
  OBSERVE: 'per',
  INVESTIGATE: 'wit', SEARCH: 'wit',
  PERSUADE: 'cha', BRIBE: 'cha', TRADE: 'cha', TALK: 'cha',
  HELP: 'con',
};

export function getChoiceStatName(affordance?: string): string | null {
  if (!affordance) return null;
  const statKey = AFFORDANCE_TO_STAT[affordance];
  return statKey ? (STAT_KOREAN_NAMES[statKey] ?? null) : null;
}

export function buildChoiceAccessibleName({
  index,
  label,
  affordance,
  isPending = false,
}: {
  index: number;
  label: string;
  affordance?: string;
  isPending?: boolean;
}): string {
  const statName = getChoiceStatName(affordance);
  return [
    `선택지 ${index + 1}: ${label}`,
    statName ? `(판정: ${statName})` : null,
    isPending ? "선택 처리 중" : null,
  ].filter(Boolean).join(" ");
}

const LOADING_MESSAGES = [
  "어둠 속에서 이야기가 풀려나간다...",
  "운명의 실타래가 엮이고 있다...",
  "잉크가 양피지 위를 스친다...",
  "그레이마르의 밤바람이 속삭인다...",
  "깃펜이 움직이기 시작한다...",
  "누군가의 발소리가 들려온다...",
  "등불이 일렁이며 그림자가 흔들린다...",
  "도시의 비밀이 드러나려 한다...",
];

// [arch/77 P5c] 렌더 유틸·독립 컴포넌트는 분리 정본 — StreamTyper/TypewriterText는
// once-guard·onComplete 멱등성 제약(스트리밍 렌더 안정화)으로 이 파일에 잔존.
import {
  LABEL_COLORS,
  LABEL_TEXT,
  renderNarrationLines,
  cleanResidualMarkers,
  parseNarrativeSegments,
  NarratorContentWithFlush,
} from "./narrative-text";
// SceneImageButton은 정의만 있고 호출 0(장면 이미지 생성 비활성 — 과금 방지)
// — 재활성화 대비로 ./SceneImageButton.tsx에 보존.
import { NpcPortraitCard } from "./NpcPortraitCard";

interface StoryBlockProps {
  message: StoryMessage;
  onChoiceSelect?: (choiceId: string) => void;
  onNarrationComplete?: () => void;
}


function NarratorLoading() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);
    // 프로그레스 바: 80%까지 빠르게 → 이후 95%까지 느리게 계속 진행
    const progTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 80) return prev + 1.5;         // 0~80%: 빠르게 (10초)
        if (prev < 95) return prev + 0.15;         // 80~95%: 느리게 (20초 추가)
        return prev;                                // 95%에서 정지
      });
    }, 200);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <div className="flex flex-col gap-2.5 py-2">
      <div className="flex items-center gap-2.5">
        {/* 깃펜 아이콘 — 글 쓰는 애니메이션 */}
        <span className="text-base animate-[quillWrite_1.5s_ease-in-out_infinite]" style={{ color: 'var(--gold)', opacity: 0.7 }}>
          ✦
        </span>
        <span
          className="text-sm font-narrative italic animate-[fadeIn_0.5s_ease-out]"
          style={{ color: 'var(--text-muted)' }}
          key={msgIndex}
        >
          {LOADING_MESSAGES[msgIndex]}
        </span>
      </div>
      {/* 프로그레스 바 */}
      <div className="h-[2px] w-32 overflow-hidden rounded-full bg-[var(--border-primary)]">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--gold), var(--success-green))',
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StreamTyper — 버퍼에서 한 글자씩 읽어 타이핑 렌더링
// 버퍼(streamTextBuffer)가 독립적으로 성장, 타이핑은 자체 속도로 진행
// ---------------------------------------------------------------------------

function StreamTyper({ onComplete }: { onComplete?: () => void }) {
  const buffer = useGameStore((s) => s.streamTextBuffer);
  const isDone = useGameStore((s) => s.streamBufferDone);
  const textSpeed = useSettingsStore((s) => s.textSpeed);
  const preset = TEXT_SPEED_PRESETS[textSpeed];

  const [typedLength, setTypedLength] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // 타이핑 타이머: 버퍼에서 한 글자씩 소비
  useEffect(() => {
    if (typedLength >= buffer.length) {
      // 버퍼 끝 도달 + done이면 타이핑 완료 (once-guard)
      if (isDone && buffer.length > 0 && !completedRef.current) {
        completedRef.current = true;
        uiLog('typer', 'StreamTyper 완료', { typedLength, bufferLen: buffer.length });
        onCompleteRef.current?.();
      }
      return; // 버퍼에 더 쌓일 때까지 대기
    }

    // 즉시 모드 — cascade render 회피 위해 microtask 에서 flush
    if (preset.charSpeed === 0) {
      queueMicrotask(() => setTypedLength(buffer.length));
      return;
    }

    // 공통 유틸: 문장부호 차등 pause 적용 (StreamingBlock 과 동일 규칙)
    const delay = getTypingDelay(buffer, typedLength, preset);

    const timer = setTimeout(() => {
      setTypedLength((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [typedLength, buffer, isDone, preset]);

  if (buffer.length === 0) return null;

  // 버퍼의 typed 부분을 parseNarrativeSegments로 포맷팅
  const visibleText = buffer.slice(0, typedLength);
  const segments = parseNarrativeSegments(cleanResidualMarkers(visibleText));
  const isTyping = typedLength < buffer.length || !isDone;

  const rendered: React.ReactNode[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === 'dialogue') {
      rendered.push(
        <DialogueBubble
          key={`st-bubble-${i}`}
          text={seg.text}
          npcName={seg.markerName ?? ''}
          npcImageUrl={seg.markerImage ?? undefined}
          compact={false}
        />,
      );
    } else {
      rendered.push(...renderNarrationLines(seg.text, `st-narr-${i}`));
    }
  }

  return (
    <>
      {rendered}
      {isTyping && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--success-green)] align-text-bottom" />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 대사 스타일링 — "" / "" 안의 텍스트를 다른 색상·폰트로 렌더
// speakingNpc가 있으면 큰따옴표 대사를 DialogueBubble로 변환
// ---------------------------------------------------------------------------

/** 인라인 스타일링만 (홑따옴표 강조 + 일반 텍스트). 큰따옴표 대사는 포함하지 않음. */

// 문장부호 차등 pause 는 settings-store.ts 의 getTypingDelay 로 일원화.
// (StreamingBlock / StreamTyper / TypewriterText 3곳 동일 규칙)

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void; speakingNpc?: SpeakingNpc }) {
  const textSpeed = useSettingsStore((s) => s.textSpeed);
  const preset = TEXT_SPEED_PRESETS[textSpeed];

  const segments = useMemo(() => parseNarrativeSegments(cleanResidualMarkers(text)), [text]);
  const [segIdx, setSegIdx] = useState(0);       // 현재 세그먼트 인덱스
  const [charIdx, setCharIdx] = useState(0);      // 현재 세그먼트 내 글자 위치
  const [prevText, setPrevText] = useState(text);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // text 변경 시 리셋 (스트리밍은 StreamTyper가 처리, TypewriterText는 폴링/최종 텍스트용)
  if (text !== prevText) {
    setPrevText(text);
    setSegIdx(0);
    setCharIdx(0);
  }

  const isComplete = segIdx >= segments.length;

  useEffect(() => {
    if (isComplete) {
      onCompleteRef.current?.();
      return;
    }

    // 즉시 모드
    if (preset.charSpeed === 0) {
      const timer = setTimeout(() => { setSegIdx(segments.length); }, 0);
      return () => clearTimeout(timer);
    }

    const seg = segments[segIdx];

    if (seg.type === 'dialogue') {
      // 대사 세그먼트: 한 글자씩 타이핑 (DialogueBubble 안에서)
      if (charIdx >= seg.text.length) {
        // 대사 완료 → 대사 후 멈춤 → 다음 세그먼트
        const timer = setTimeout(() => {
          setSegIdx((prev) => prev + 1);
          setCharIdx(0);
        }, preset.charSpeed * 15); // 대사 후 ~375ms 멈춤
        return () => clearTimeout(timer);
      }
      // 대사 글자 타이핑 (narration 보다 약간 빠르게, 문장부호 규칙은 동일)
      const dialoguePreset = {
        ...preset,
        charSpeed: Math.max(Math.floor(preset.charSpeed * 0.7), 5),
      };
      const delay = getTypingDelay(seg.text, charIdx, dialoguePreset);
      const timer = setTimeout(() => {
        setCharIdx((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }

    // narration 세그먼트: 한 글자씩
    if (charIdx >= seg.text.length) {
      // 세그먼트 완료 → 마지막 글자 기반 pause + dialogue 대비 pause 병합.
      // 서버가 문장 단위로 분할하므로 마침표/물음표 등 문장 끝 구두점은
      // 항상 세그먼트 말미. 여기서 pause 를 걸어야 문장→문장 리듬 유지.
      const nextSeg = segments[segIdx + 1];
      const endDelay = getTypingDelay(seg.text, seg.text.length, preset);
      const dialoguePause =
        nextSeg?.type === 'dialogue' ? preset.charSpeed * 8 : 0;
      const pause = Math.max(endDelay, dialoguePause);
      const timer = setTimeout(() => {
        setSegIdx((prev) => prev + 1);
        setCharIdx(0);
      }, pause);
      return () => clearTimeout(timer);
    }

    const delay = getTypingDelay(seg.text, charIdx, preset);
    const timer = setTimeout(() => {
      setCharIdx((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [segIdx, charIdx, segments, preset, isComplete]);

  // 렌더링: 완료된 세그먼트 + 현재 타이핑 중인 세그먼트
  const rendered: React.ReactNode[] = [];
  for (let i = 0; i < Math.min(segIdx + 1, segments.length); i++) {
    const seg = segments[i];
    if (seg.type === 'dialogue' && i <= segIdx) {
      // 대사 → DialogueBubble (타이핑 중이면 부분 텍스트)
      const dialogueText = i < segIdx ? seg.text : seg.text.slice(0, charIdx);
      if (dialogueText || i < segIdx) {
        rendered.push(
          <DialogueBubble
            key={`tw-bubble-${i}`}
            text={dialogueText || seg.text}
            npcName={seg.markerName ?? ''}
            npcImageUrl={seg.markerImage ?? undefined}
            compact={false}
          />,
        );
      }
    } else if (seg.type === 'narration') {
      const displayText = i < segIdx ? seg.text : seg.text.slice(0, charIdx);
      if (displayText) {
        rendered.push(...renderNarrationLines(displayText, `tw-narr-${i}`));
      }
    }
  }

  return (
    <>
      {rendered}
      {!isComplete && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[var(--success-green)] align-text-bottom" />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// SceneImageButton — NARRATOR 메시지 하단에 장면 이미지 생성 버튼
// ---------------------------------------------------------------------------

export function StoryBlock({ message, onChoiceSelect, onNarrationComplete }: StoryBlockProps) {
  // NARRATOR가 loading → 텍스트로 전환될 때 타이핑 애니메이션 트리거 (derived state 패턴)
  // Hooks must be called before any early return (rules-of-hooks)
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevLoading, setPrevLoading] = useState(message.loading);
  const [wasLoading, setWasLoading] = useState(!!message.loading);
  const [selectingChoiceId, setSelectingChoiceId] = useState<string | null>(null);
  const choiceRegionRef = useRef<HTMLDivElement>(null);
  const announcedChoiceBlockRef = useRef<string | null>(null);
  const fontSizeKey = useSettingsStore((s) => s.fontSize);
  const isStreaming = useGameStore((s) => s.isStreaming);
  const streamSegments = useGameStore((s) => s.streamSegments);
  const streamTextBuffer = useGameStore((s) => s.streamTextBuffer);
  // P0-1: 선택지 버튼 클릭 잠금 — submit 진행 중에는 시각/접근성 모두 disabled 로 명확히
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  // P0-2: Track 2 (선택지 nano 재생성) 로딩 시 사용자에게 "선택지 생성 중" 명시
  const choicesLoading = useGameStore((s) => s.choicesLoading);
  const fontSizes = FONT_SIZE_PRESETS[fontSizeKey];

  useEffect(() => {
    if (!isSubmitting) {
      setSelectingChoiceId(null);
    }
  }, [isSubmitting]);

  useEffect(() => {
    const hasActiveChoices =
      message.type === "CHOICE" &&
      !!message.choices?.length &&
      !message.selectedChoiceId &&
      !!onChoiceSelect;
    if (!hasActiveChoices || announcedChoiceBlockRef.current === message.id) return;

    announcedChoiceBlockRef.current = message.id;
    const region = choiceRegionRef.current;
    if (!region) return;

    window.requestAnimationFrame(() => {
      const scrollParent = (() => {
        let parent = region.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          const canScroll = /(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight;
          if (canScroll) return parent;
          parent = parent.parentElement;
        }
        return null;
      })();

      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const regionRect = region.getBoundingClientRect();
        scrollParent.scrollTo({
          top:
            scrollParent.scrollTop +
            (regionRect.top - parentRect.top) -
            parentRect.height / 2 +
            regionRect.height / 2,
          behavior: "smooth",
        });
      } else {
        region.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      region.focus({ preventScroll: true });
    });
  }, [message.id, message.type, message.choices?.length, message.selectedChoiceId, onChoiceSelect]);

  // RESOLVE 타입: 주사위 애니메이션 → 판정 결과 공개 (별도 블록)
  // 과거 턴(history-resolve-*) 재방문 시 애니메이션 건너뜀
  if (message.type === "RESOLVE" && message.resolveOutcome) {
    const isHistory = message.id.startsWith("history-");
    return (
      <ResolveOutcomeInline
        outcome={message.resolveOutcome}
        breakdown={message.resolveBreakdown}
        skipAnimation={isHistory}
      />
    );
  }

  // [D2-a — arch/76] FREE 자유 행동 → 주사위 스킵 안내 (판정 투명성)
  if (message.type === "RESOLVE" && message.resolveSkipped) {
    return (
      <div className="flex items-center justify-center py-2">
        <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <span role="img" aria-label="check">✓</span>
          일상 행동 — 판정 불필요
        </span>
      </div>
    );
  }

  const labelColor = LABEL_COLORS[message.type] ?? "var(--text-muted)";
  const isPlayer = message.type === "PLAYER";
  const isNarrator = message.type === "NARRATOR";
  const borderColor = isPlayer ? "var(--gold)" : "var(--border-primary)";
  const bgColor = message.type === "CHOICE" || isPlayer ? "var(--bg-secondary)" : "var(--bg-card)";

  if (prevLoading !== message.loading) {
    setPrevLoading(message.loading);
    if (message.loading) {
      setWasLoading(true);
    } else if (wasLoading && isNarrator && message.text) {
      setWasLoading(false);
      setShouldAnimate(true);
      uiLog('narrator', 'loading→false 전환 → shouldAnimate', { id: message.id, textLen: message.text.length, isStreaming, streamBufLen: streamTextBuffer.length });
    }
  }

  const isNarratorTypewriting = isNarrator && shouldAnimate && !message.loading && !message.typed;

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
        isStreaming && streamSegments.length > 0 ? (
          // Queue-based Streaming (bug 4725, architecture/39 Phase B):
          //   서버 분류된 segments 를 StreamingBlock 이 받아 말풍선 프레임 프리렌더 +
          //   내부 타이핑. narration/dialogue 구분 즉시 적용 → Phase 1/2 일치.
          <div
            className="font-narrative leading-[1.75]"
            style={{ color: "var(--text-primary)", fontSize: `${fontSizes.narrative}px` }}
          >
            <StreamingBlock
              segments={streamSegments}
              isDone={useGameStore.getState().streamBufferDone}
              choicesLoading={choicesLoading}
              onComplete={() => {
                const store = useGameStore.getState();
                const finalText = store.streamTextBuffer;
                uiLog('typer', 'StreamingBlock→onComplete', { msgId: message.id, segCount: streamSegments.length, finalTextLen: finalText.length });
                if (!store.isStreaming || finalText.length === 0) {
                  return;
                }
                useGameStore.setState({
                  isStreaming: false,
                  streamSegments: [],
                  streamTextBuffer: '',
                  streamBufferDone: false,
                });
                const msgs = store.messages.map((msg) =>
                  msg.id === message.id ? { ...msg, text: finalText, loading: false, typed: true } : msg,
                );
                useGameStore.setState({ messages: msgs });
                onNarrationComplete?.();
              }}
            />
          </div>
        ) : isStreaming && streamTextBuffer.length > 0 ? (
          // Fallback: segments 아직 없지만 buffer 있을 때 (token 모드)
          <div
            className="font-narrative leading-[1.75]"
            style={{ color: "var(--text-primary)", fontSize: `${fontSizes.narrative}px` }}
          >
            <StreamTyper
              onComplete={() => {
                const store = useGameStore.getState();
                const finalText = store.streamTextBuffer;
                if (!store.isStreaming || finalText.length === 0) return;
                useGameStore.setState({
                  isStreaming: false,
                  streamSegments: [],
                  streamTextBuffer: '',
                  streamBufferDone: false,
                });
                const msgs = store.messages.map((msg) =>
                  msg.id === message.id ? { ...msg, text: finalText, loading: false, typed: true } : msg,
                );
                useGameStore.setState({ messages: msgs });
                onNarrationComplete?.();
              }}
            />
          </div>
        ) : <NarratorLoading />

      ) : message.type === "CHOICE" && message.choices && (onChoiceSelect || message.selectedChoiceId) ? (
        <div
          ref={choiceRegionRef}
          tabIndex={-1}
          role="group"
          aria-label="선택지"
          className="flex scroll-mt-6 flex-col gap-1 outline-none"
        >
          {message.selectedChoiceId ? (
            (() => {
              const selected = message.choices.find(
                (c) => c.id === message.selectedChoiceId,
              );
              if (!selected) return null;
              const idx = message.choices.indexOf(selected);
              return (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-md px-3 py-2 font-display leading-[1.6]"
                  style={{
                    color: "var(--gold)",
                    opacity: 0.7,
                    fontSize: `${fontSizes.choice}px`,
                  }}
                >
                  {idx + 1}. {selected.label}
                </div>
              );
            })()
          ) : (
            <>
              <div
                role="status"
                aria-live="polite"
                className="sticky top-0 z-10 mb-1 rounded-md border border-[rgba(201,169,98,0.35)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-semibold text-[var(--gold)] shadow-sm"
              >
                선택지가 준비되었습니다. 아래에서 다음 행동을 선택하세요.
              </div>
              {message.choices.map((choice, i) => {
                // P0-1: 제출 진행 중이거나 choice.disabled 면 시각 + 접근성 모두 잠금
                const isPendingChoice = selectingChoiceId === choice.id;
                const isLocked = isSubmitting || selectingChoiceId !== null || !!choice.disabled;
                return (
                <button
                  key={choice.id}
                  type="button"
                  data-testid="choice-btn"
                  data-choice-id={choice.id}
                  data-choice-index={i}
                  aria-label={buildChoiceAccessibleName({
                    index: i,
                    label: choice.label,
                    affordance: choice.affordance,
                    isPending: isPendingChoice,
                  })}
                  aria-busy={isPendingChoice || isSubmitting || undefined}
                  aria-disabled={isLocked || undefined}
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    setSelectingChoiceId(choice.id);
                    onChoiceSelect?.(choice.id);
                  }}
                  className={`choice-btn rounded-md px-3 py-2 text-left font-display leading-[1.6] max-w-full [word-break:keep-all] transition-opacity ${
                    isLocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  }`}
                  style={{
                    color: choice.disabled
                      ? "var(--text-secondary)"
                      : "var(--text-primary)",
                    fontSize: `${Math.max(fontSizes.choice, 16)}px`,
                  }}
                >
                  <span>{i + 1}. {choice.label}</span>
                  {isPendingChoice && (
                    <span
                      aria-hidden="true"
                      className="ml-2 inline-block rounded border border-[var(--gold)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--gold)]"
                    >
                      처리 중
                    </span>
                  )}
                  {(() => {
                    const statKey = choice.affordance ? AFFORDANCE_TO_STAT[choice.affordance] : undefined;
                    if (!statKey) return null;
                    const color = STAT_COLORS[statKey.toUpperCase()];
                    const name = STAT_KOREAN_NAMES[statKey];
                    return (
                      <span aria-hidden="true" className="ml-1.5 inline-flex items-center gap-1">
                        <span className="text-[var(--text-muted)]">·</span>
                        <span
                          className="inline-block rounded px-1 py-0.5 text-[10px] font-semibold leading-none opacity-80"
                          style={{ color, borderWidth: 1, borderStyle: 'solid', borderColor: color }}
                        >
                          {name}
                        </span>
                      </span>
                    );
                  })()}
                  {choice.modifier != null && choice.modifier !== 0 && (
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block rounded px-1 py-0.5 text-[10px] font-semibold leading-none"
                      style={{
                        color: choice.modifier > 0 ? 'var(--success-green)' : 'var(--hp-red)',
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: choice.modifier > 0 ? 'var(--success-green)' : 'var(--hp-red)',
                      }}
                    >
                      {choice.modifier > 0 ? `+${choice.modifier}` : choice.modifier}
                    </span>
                  )}
                </button>
                );
              })}
            </>
          )}
        </div>
      ) : isNarrator ? (
        /* ── 내레이터: 대사 스타일 + 문단 간격 ── */
        <div
          className="font-narrative leading-[1.75]"
          style={{ color: "var(--text-primary)", fontSize: `${fontSizes.narrative}px` }}
        >
          {message.npcPortrait && <NpcPortraitCard npcPortrait={message.npcPortrait} />}
          {isNarratorTypewriting ? (
            <TypewriterText
              text={message.text}
              speakingNpc={message.speakingNpc}
              onComplete={() => {
                setShouldAnimate(false);
                onNarrationComplete?.();
              }}
            />
          ) : (
            <NarratorContentWithFlush text={message.text} speakingNpc={message.speakingNpc} onReady={onNarrationComplete} />
          )}
          {/* 장면 그리기 버튼 — 비활성화 (고도화 후 복원) */}
        </div>
      ) : (
        /* ── 일반 메시지 (PLAYER, SYSTEM) ── */
        <>
          {message.locationImage && (
            <div className="relative mb-2 h-[120px] w-full overflow-hidden rounded lg:h-[160px]">
              {/* 켄 번스 효과: 서서히 줌인 + 미세 패닝 */}
              <div className="absolute inset-0 animate-[kenBurns_8s_ease-in-out_forwards]">
                <Image
                  src={message.locationImage}
                  alt="장소"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover"
                />
              </div>
              {/* 비네팅: 가장자리 어둡게 → 중심 밝아짐 */}
              <div className="pointer-events-none absolute inset-0 animate-[vignetteReveal_1.5s_ease-out_forwards]"
                style={{
                  background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
                }}
              />
              {/* 하단 그라디언트 (카드 배경으로 자연스럽게 이어짐) */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[var(--bg-card)]" />
            </div>
          )}
          <p
            className={`leading-[1.75] whitespace-pre-line ${
              isPlayer ? "font-ui italic" : "font-narrative"
            }`}
            style={{
              color: message.tags?.includes('POSTURE_CHANGE')
                ? 'var(--gold)'
                : isPlayer ? "var(--text-secondary)" : "var(--text-primary)",
              fontSize: `${fontSizes.narrative}px`,
              ...(message.tags?.includes('POSTURE_CHANGE') ? { fontStyle: 'italic' } : {}),
            }}
          >
            {message.text}
          </p>
        </>
      )}
    </div>
  );
}
