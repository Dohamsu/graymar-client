import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import type { StoryMessage } from "@/types/game";
import { ResolveOutcomeInline } from "@/components/hub/ResolveOutcomeBanner";
import { useSettingsStore, TEXT_SPEED_PRESETS, FONT_SIZE_PRESETS } from "@/store/settings-store";
import { STAT_COLORS, STAT_KOREAN_NAMES } from "@/data/stat-descriptions";
import { useGameStore } from "@/store/game-store";
import { DialogueBubble } from "./DialogueBubble";

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

const SCENE_LOADING_MSGS = [
  "장면을 그리는 중...",
  "배경에 색을 입히는 중...",
  "빛과 그림자를 조율하는 중...",
  "분위기를 완성하는 중...",
];

function SceneImageLoading() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % SCENE_LOADING_MSGS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
      <span className="text-xs text-[var(--text-muted)] animate-pulse">{SCENE_LOADING_MSGS[msgIdx]}</span>
    </div>
  );
}

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
    }, 5000);
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
// speakingNpc가 있으면 큰따옴표 대사를 DialogueBubble로 변환
// ---------------------------------------------------------------------------

/** 인라인 스타일링만 (홑따옴표 강조 + 일반 텍스트). 큰따옴표 대사는 포함하지 않음. */
function renderInlineText(text: string, keyBase: number): { nodes: React.ReactNode[]; nextKey: number } {
  const parts: React.ReactNode[] = [];
  const regex = /('[^']*'?|\u2018[^\u2019]*\u2019?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    // 홑따옴표 = 쪽지/간판/소문 인용, 단어 강조 → 밝은 청록색 + 볼드
    parts.push(
      <span key={key++} className="font-semibold" style={{ color: "var(--info-blue)" }}>
        {match[0]}
      </span>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  return { nodes: parts, nextKey: key };
}

function renderStyledText(text: string, speakingNpc?: SpeakingNpc): React.ReactNode {
  // 텍스트에 @[마커]가 있으면 speakingNpc 없어도 마커 파싱 경로로 진행 (이어하기 복원용)
  const hasAtMarker = /@\[/.test(text);

  // speakingNpc가 없고 @마커도 없으면 기존 동작 (큰따옴표 = 골드색 블록, 작은따옴표 = 인라인)
  if (!speakingNpc && !hasAtMarker) {
    const parts: React.ReactNode[] = [];
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
          className={isDialogue ? "block my-6 font-dialogue" : "font-semibold"}
          style={{ color: isDialogue ? "var(--gold)" : "var(--info-blue)" }}
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

  // @[NPC이름] "대사" 또는 @[NPC이름|초상화URL] "대사" 또는 일반 "대사" → DialogueBubble
  const segments: React.ReactNode[] = [];
  // @[표시이름] 또는 @[표시이름|URL] "대사" 패턴 + 일반 큰따옴표 대사
  const dialogueRegex = /(?:@\[([^\]]*)\]\s*)?("[^"]*"?|\u201C[^\u201D]*\u201D?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const npcBubbleCounts = new Map<string, number>(); // NPC별 연속 대사 카운트

  while ((match = dialogueRegex.exec(text)) !== null) {
    const rawMarker = match[1]; // @[이름] 또는 @[이름|URL] 에서 추출
    const rawDialogue = match[2];

    // @[이름|URL] 분리
    let markerName: string | undefined;
    let markerImage: string | undefined;
    if (rawMarker) {
      const pipeIdx = rawMarker.indexOf('|');
      if (pipeIdx >= 0) {
        markerName = rawMarker.slice(0, pipeIdx).trim();
        markerImage = rawMarker.slice(pipeIdx + 1).trim() || undefined;
      } else {
        markerName = rawMarker.trim();
      }
    }

    // 마커 포함하여 앞부분 서술 추출 (마커 앞의 @[ 시작 위치)
    const fullMatchStart = markerName !== undefined
      ? text.lastIndexOf(`@[${markerName}]`, match.index)
      : match.index;
    const actualStart = fullMatchStart >= 0 ? fullMatchStart : match.index;

    // 대사 앞 서술 부분
    if (actualStart > lastIndex) {
      const narration = text.slice(lastIndex, actualStart);
      const { nodes, nextKey } = renderInlineText(narration, key);
      key = nextKey;
      if (nodes.length > 0) {
        segments.push(<span key={`narr-${key++}`} className="block">{nodes}</span>);
      }
    }

    // NPC 이름 결정: @[이름] 마커 > speakingNpc fallback
    const npcName = markerName || speakingNpc?.displayName || '무명 인물';
    // 초상화: @[이름|URL]의 URL > speakingNpc fallback
    const npcImage = markerName
      ? markerImage // 마커에 초상화 URL 포함 (소개된 NPC만)
      : speakingNpc?.imageUrl;

    // 연속 대사 카운트 (같은 NPC면 compact)
    const count = npcBubbleCounts.get(npcName) ?? 0;
    npcBubbleCounts.set(npcName, count + 1);

    const strippedDialogue = rawDialogue.replace(/^[""\u201C]|[""\u201D]$/g, '').trim();
    if (strippedDialogue) {
      segments.push(
        <DialogueBubble
          key={`bubble-${key++}`}
          text={strippedDialogue}
          npcName={npcName}
          npcImageUrl={npcImage}
          compact={count > 0}
        />,
      );
    }
    lastIndex = dialogueRegex.lastIndex;
  }

  // 대사 뒤 서술 부분
  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex);
    const { nodes, nextKey } = renderInlineText(trailing, key);
    key = nextKey;
    if (nodes.length > 0) {
      segments.push(<span key={`narr-${key}`} className="block">{nodes}</span>);
    }
  }

  return <>{segments}</>;
}

// ---------------------------------------------------------------------------
// NarratorContent — 문단 간격 + 대사 스타일링
// ---------------------------------------------------------------------------

function NarratorContent({ text, speakingNpc }: { text: string; speakingNpc?: SpeakingNpc }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) =>
        line === "" ? (
          // 빈 줄 = 문단 구분 간격
          <span key={i} className="block h-3" aria-hidden="true" />
        ) : (
          <span key={i} className="block">
            {renderStyledText(line, speakingNpc)}
          </span>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// TypewriterText — 세그먼트 기반 타이핑 + 대사 즉시 표시 + 리듬감
// ---------------------------------------------------------------------------

/** 서술 텍스트를 narration/dialogue 세그먼트로 사전 분할 */
interface NarrSegment {
  type: 'narration' | 'dialogue';
  text: string;          // narration: 서술 텍스트, dialogue: 대사 텍스트
  markerName?: string;   // dialogue: NPC 표시명
  markerImage?: string;  // dialogue: 초상화 URL
}

function parseNarrativeSegments(text: string): NarrSegment[] {
  const segments: NarrSegment[] = [];
  const regex = /@\[([^\]]*)\]\s*("[^"]*"?|\u201C[^\u201D]*\u201D?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // @[마커] 시작 위치 찾기
    const markerStart = text.lastIndexOf(`@[${match[1]}]`, match.index);
    const actualStart = markerStart >= 0 ? markerStart : match.index;

    // 마커 앞의 서술 부분
    if (actualStart > lastIndex) {
      segments.push({ type: 'narration', text: text.slice(lastIndex, actualStart) });
    }

    // 마커 파싱
    const rawMarker = match[1];
    const pipeIdx = rawMarker.indexOf('|');
    const markerName = pipeIdx >= 0 ? rawMarker.slice(0, pipeIdx).trim() : rawMarker.trim();
    const markerImage = pipeIdx >= 0 ? rawMarker.slice(pipeIdx + 1).trim() : undefined;

    // 대사 텍스트 (따옴표 제거)
    const rawDialogue = match[2];
    const stripped = rawDialogue.replace(/^["\u201C]|["\u201D]$/g, '');

    segments.push({
      type: 'dialogue',
      text: stripped,
      markerName: markerName || undefined,
      markerImage: markerImage || undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  // 나머지 서술
  if (lastIndex < text.length) {
    segments.push({ type: 'narration', text: text.slice(lastIndex) });
  }

  // @마커가 없으면 원본 텍스트 그대로 (기존 동작 유지)
  if (segments.length === 0) {
    segments.push({ type: 'narration', text });
  }

  return segments;
}

/** 구두점에 따른 타이핑 딜레이 계산 */
function getCharDelay(
  text: string,
  pos: number,
  charSpeed: number,
  paragraphPause: number,
): number {
  if (pos >= text.length) return 0;
  const ch = text[pos - 1]; // 방금 표시한 문자
  if (!ch) return charSpeed;
  // 문단 경계
  if (ch === '\n' && pos < text.length && text[pos] === '\n') return paragraphPause;
  // 마침표/느낌표/물음표 뒤 멈춤
  if ('.!?。'.includes(ch)) return charSpeed * 5;
  // 쉼표/세미콜론 뒤 살짝 멈춤
  if (',;，'.includes(ch)) return charSpeed * 2;
  return charSpeed;
}

function TypewriterText({ text, onComplete, speakingNpc }: { text: string; onComplete?: () => void; speakingNpc?: SpeakingNpc }) {
  const textSpeed = useSettingsStore((s) => s.textSpeed);
  const preset = TEXT_SPEED_PRESETS[textSpeed];

  const segments = useMemo(() => parseNarrativeSegments(text), [text]);
  const [segIdx, setSegIdx] = useState(0);       // 현재 세그먼트 인덱스
  const [charIdx, setCharIdx] = useState(0);      // 현재 세그먼트 내 글자 위치
  const [prevText, setPrevText] = useState(text);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // text 변경 시 리셋
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
      // 대사 글자 타이핑 (narration보다 약간 빠르게)
      const dialogueSpeed = Math.max(Math.floor(preset.charSpeed * 0.7), 5);
      const delay = getCharDelay(seg.text, charIdx, dialogueSpeed, preset.paragraphPause);
      const timer = setTimeout(() => {
        setCharIdx((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    }

    // narration 세그먼트: 한 글자씩
    if (charIdx >= seg.text.length) {
      // 세그먼트 완료 → 다음 세그먼트
      const nextSeg = segments[segIdx + 1];
      const pauseBeforeDialogue = nextSeg?.type === 'dialogue' ? preset.charSpeed * 8 : 0;
      const timer = setTimeout(() => {
        setSegIdx((prev) => prev + 1);
        setCharIdx(0);
      }, pauseBeforeDialogue);
      return () => clearTimeout(timer);
    }

    const delay = getCharDelay(seg.text, charIdx, preset.charSpeed, preset.paragraphPause);
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
        const { nodes } = renderInlineText(displayText, i * 1000);
        rendered.push(
          <span key={`tw-narr-${i}`} className="leading-relaxed">{nodes}</span>,
        );
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

function extractTurnNo(messageId: string): number | null {
  const match = messageId.match(/^narrator-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function SceneImageButton({ messageId }: { messageId: string }) {
  const turnNo = extractTurnNo(messageId);
  const sceneImages = useGameStore((s) => s.sceneImages);
  const sceneImageRemaining = useGameStore((s) => s.sceneImageRemaining);
  const sceneImageLoading = useGameStore((s) => s.sceneImageLoading);
  const requestSceneImage = useGameStore((s) => s.requestSceneImage);

  const [fadeIn, setFadeIn] = useState(false);

  const imageUrl = turnNo !== null ? sceneImages[turnNo] : undefined;
  const isLoading = turnNo !== null ? !!sceneImageLoading[turnNo] : false;
  const isExhausted = sceneImageRemaining <= 0;

  const handleClick = useCallback(() => {
    if (turnNo === null || isLoading || imageUrl) return;
    requestSceneImage(turnNo);
  }, [turnNo, isLoading, imageUrl, requestSceneImage]);

  useEffect(() => {
    if (imageUrl) {
      const timer = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [imageUrl]);

  if (turnNo === null) return null;

  // Already generated — show image
  if (imageUrl) {
    return (
      <div className="mt-3">
        <div
          className="relative w-full overflow-hidden rounded-lg transition-opacity duration-700"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          <Image
            src={imageUrl}
            alt="장면 이미지"
            width={768}
            height={432}
            className="h-auto w-full rounded-lg"
            unoptimized
          />
        </div>
      </div>
    );
  }

  // Loading state with rotating messages
  if (isLoading) {
    return <SceneImageLoading />;
  }

  // Button
  return (
    <button
      onClick={handleClick}
      disabled={isExhausted}
      className="mt-2 cursor-pointer rounded px-2 py-1 text-xs transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        color: isExhausted ? 'var(--text-muted)' : 'var(--gold)',
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${isExhausted ? 'var(--border-primary)' : 'var(--gold)'}`,
      }}
    >
      {isExhausted ? '이미지 생성 한도 초과' : '\uD83C\uDFA8 장면 그리기'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NpcPortraitCard — NPC 초상화 카드 (NARRATOR 메시지 상단)
// ---------------------------------------------------------------------------

function NpcPortraitCard({ npcPortrait }: { npcPortrait: NonNullable<StoryMessage['npcPortrait']> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="mb-3 flex items-center gap-3 rounded-lg p-3 transition-opacity duration-500"
      style={{
        opacity: visible ? 1 : 0,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
      }}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={npcPortrait.imageUrl}
          alt={npcPortrait.npcName}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span
          className="text-sm font-semibold font-display"
          style={{ color: 'var(--text-primary)' }}
        >
          {npcPortrait.npcName}
        </span>
        {npcPortrait.isNewlyIntroduced && (
          <span
            className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              color: 'var(--gold)',
              border: '1px solid var(--gold)',
            }}
          >
            첫 만남
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryBlock
// ---------------------------------------------------------------------------

export function StoryBlock({ message, onChoiceSelect, onNarrationComplete }: StoryBlockProps) {
  // NARRATOR가 loading → 텍스트로 전환될 때 타이핑 애니메이션 트리거 (derived state 패턴)
  // Hooks must be called before any early return (rules-of-hooks)
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevLoading, setPrevLoading] = useState(message.loading);
  const [wasLoading, setWasLoading] = useState(!!message.loading);
  const fontSizeKey = useSettingsStore((s) => s.fontSize);
  const fontSizes = FONT_SIZE_PRESETS[fontSizeKey];

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
            message.choices.map((choice, i) => (
              <button
                key={choice.id}
                onClick={() => onChoiceSelect?.(choice.id)}
                className="choice-btn cursor-pointer rounded-md px-3 py-2 text-left font-display leading-[1.6] max-w-full [word-break:keep-all]"
                style={{
                  color: choice.disabled
                    ? "var(--text-secondary)"
                    : "var(--text-primary)",
                  fontSize: `${Math.max(fontSizes.choice, 16)}px`,
                }}
              >
                {i + 1}. {choice.label}
                {(() => {
                  const statKey = choice.affordance ? AFFORDANCE_TO_STAT[choice.affordance] : undefined;
                  if (!statKey) return null;
                  const color = STAT_COLORS[statKey.toUpperCase()];
                  const name = STAT_KOREAN_NAMES[statKey];
                  return (
                    <span
                      className="ml-1.5 inline-block rounded px-1 py-0.5 text-[10px] font-semibold leading-none opacity-80"
                      style={{ color, borderWidth: 1, borderStyle: 'solid', borderColor: color }}
                    >
                      {name}
                    </span>
                  );
                })()}
                {choice.modifier != null && choice.modifier !== 0 && (
                  <span
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
            ))
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
            <NarratorContent text={message.text} speakingNpc={message.speakingNpc} />
          )}
          {/* 장면 그리기 버튼 — 비활성화 (고도화 후 복원) */}
        </div>
      ) : (
        /* ── 일반 메시지 (PLAYER, SYSTEM) ── */
        <>
          {message.locationImage && (
            <div className="relative mb-2 h-[120px] w-full overflow-hidden rounded lg:h-[160px]">
              <Image
                src={message.locationImage}
                alt="장소"
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-60% to-[var(--bg-card)]" />
            </div>
          )}
          <p
            className={`leading-[1.75] whitespace-pre-line ${
              isPlayer ? "font-ui italic" : "font-narrative"
            }`}
            style={{
              color: isPlayer ? "var(--text-secondary)" : "var(--text-primary)",
              fontSize: `${fontSizes.narrative}px`,
            }}
          >
            {message.text}
          </p>
        </>
      )}
    </div>
  );
}
