import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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

    // 즉시 모드
    if (preset.charSpeed === 0) {
      setTypedLength(buffer.length);
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
function renderInlineText(text: string, keyBase: number): { nodes: React.ReactNode[]; nextKey: number } {
  // 타이핑 도중 narration에 잔류한 @[마커|URL] 제거 + 불완전 @[ 패턴도 제거
  text = text.replace(/@\[[^\]]*\]/g, '');
  text = text.replace(/@\[[^\]]*$/g, ''); // 타이핑 중 잘린 @[... 패턴
  text = text.replace(/@마커/g, ''); // LLM이 출력한 @마커 리터럴
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

/** narration 텍스트를 \n 기준 block 래핑 — NarratorContent(완료 경로)와 동일한 레이아웃 */
function renderNarrationLines(text: string, keyBase: string): React.ReactNode[] {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "") {
      out.push(<span key={`${keyBase}-blank-${i}`} className="block h-3" aria-hidden="true" />);
      continue;
    }
    const { nodes } = renderInlineText(line, i * 1000);
    out.push(
      <span key={`${keyBase}-line-${i}`} className="block">
        {nodes}
      </span>,
    );
  }
  return out;
}

/** 잔여 @태그 클린업 + 마커 재배치 — 서버 후처리에서 미처리된 마커 방어 */
function cleanResidualMarkers(text: string): string {
  // 0. 중첩 @마커 해소 — `@[@[...]]` 형태 (bug ca038140)
  //    서버가 제거하지 못한 경우 double safety.
  {
    let guard = 0;
    while (text.includes("@[@[") && guard < 5) {
      text = text.replace(/@\[@\[([^\]]+)\]\]/g, "@[$1]");
      guard += 1;
    }
  }

  // 1. 대사 내부에 끼인 @마커를 대사 앞으로 재배치 (같은 줄 내에서만)
  //    "대사 텍스트@[호칭] " → @[호칭] "대사 텍스트"
  //    줄바꿈이 포함되면 다른 대사 쌍과 혼동되므로 제외
  text = text.replace(
    /(["\u201C])([^"\u201D\n]*?)@\[([^\]]+)\]\s*(["\u201D])/g,
    (_, q1, before, marker, q2) => `@[${marker}] ${q1}${before}${q2}`,
  );

  // 2. 대사 끝 직후에 붙은 @마커 → 제거
  text = text.replace(
    /(["\u201D])(\s*)@\[([^\]]+)\]\s*(?=[^"\u201C]|$)/g,
    (match, q, space, marker) => `${q}${space}`,
  );

  // 2b. 문장 끝에 닫힘 따옴표 없이 붙은 @마커 → 마커를 대사 앞으로 이동
  //     "대사.@[마커|URL]" 또는 "대사.@[마커|URL]\n" 패턴
  text = text.replace(
    /([.!?。])@\[([^\]]+)\]\s*/g,
    (_, punct, marker) => `${punct}\n@[${marker}] `,
  );

  // 3. @NPC_ID raw 제거
  text = text.replace(/@NPC_[A-Z_0-9]+\s*/g, '');

  // 4. /npc-portraits/ URL이 텍스트에 노출된 경우 제거 (마커 @[이름|URL] 안의 URL은 보존)
  text = text.replace(/(?<!\|)\/npc-portraits\/[^\s\]"]+/g, '');

  // 5. 대사와 연결되지 않은 고립 @[이름] 또는 @[이름|URL] 마커 제거
  //    마커 뒤에 공백/줄바꿈 후 따옴표가 오면 대사 연결 → 유지
  text = text.replace(/@\[[^\]]*\](?![\s\n]*["\u201C])/g, '');

  // 6. 서버 이중 마커 잔해 방어 — @ 프리픽스 없이 대사 내부에 남은 [이름|URL] 패턴.
  //    정상 @[이름|URL] 마커는 앞 문자가 @이므로 보호. npc-portraits 경로를 포함
  //    하거나 pipe 형태 name|url 인 것만 제거해서 일반 대괄호 사용과 충돌 최소화.
  text = text.replace(/(^|[^@])\[[^\]|]+\|\/npc-portraits\/[^\]]+\]\s*/g, '$1');

  // 7. 비대칭 ASCII 큰따옴표 정리 — 서버 5.10.7 실패 시 double safety (bug ca038140 / 862125fc)
  //    " 개수가 홀수면 orphan 이 존재해 다음 서술까지 대사 범위로 확장되는 현상.
  //    마지막 " 한 개를 제거해 쌍이 맞도록 조정.
  {
    const dqCount = (text.match(/"/g) || []).length;
    if (dqCount % 2 === 1) {
      const lastIdx = text.lastIndexOf('"');
      if (lastIdx >= 0) {
        text = text.slice(0, lastIdx) + text.slice(lastIdx + 1);
      }
    }
  }

  return text.trim();
}

function renderStyledText(text: string, speakingNpc?: SpeakingNpc): React.ReactNode {
  // 잔여 @태그 클린업
  text = cleanResidualMarkers(text);
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

/** NarratorContent 래퍼 — typed=true 경로에서 사용 (flushPending은 명시적 타이핑 완료 시만 호출) */
function NarratorContentWithFlush({ text, speakingNpc }: { text: string; speakingNpc?: SpeakingNpc; onReady?: () => void }) {
  return <NarratorContent text={text} speakingNpc={speakingNpc} />;
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
  const regex = /@\[([^\]]*)\][\s\n]*("[^"]*"?|\u201C[^\u201D]*\u201D?)/g;
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

    // 길이 임계 200자 — LLM 의 비대칭 따옴표로 서술이 통째로 대사로 잡히는
    // 오탐 방지 (bug ca038140). 200자 넘으면 dialogue 로 신뢰하지 않고
    // narration 으로 downgrade. 실제 NPC 대사 최대 100자 내외.
    const DIALOGUE_MAX = 200;
    if (stripped.length > DIALOGUE_MAX) {
      segments.push({
        type: 'narration',
        text: text.slice(actualStart, match.index + match[0].length),
      });
    } else {
      segments.push({
        type: 'dialogue',
        text: stripped,
        markerName: markerName || undefined,
        markerImage: markerImage || undefined,
      });
    }

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

// 문장부호 차등 pause 는 settings-store.ts 의 getTypingDelay 로 일원화.
// (StreamingBlock / StreamTyper / TypewriterText 3곳 동일 규칙)

function TypewriterText({ text, onComplete, speakingNpc }: { text: string; onComplete?: () => void; speakingNpc?: SpeakingNpc }) {
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
  const [phase, setPhase] = useState<'hidden' | 'slide' | 'name' | 'badge'>('hidden');

  // 복합 카드 지원 (bug 4737): npcs 배열이 있으면 여러 NPC, 아니면 단일
  const npcs = npcPortrait.npcs ?? [
    {
      npcId: npcPortrait.npcId,
      npcName: npcPortrait.npcName,
      imageUrl: npcPortrait.imageUrl,
      isNewlyIntroduced: npcPortrait.isNewlyIntroduced,
    },
  ];
  const isCompound = npcs.length > 1;
  const maxNameLen = Math.max(...npcs.map((n) => n.npcName.length));

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('slide'), 50);
    const t2 = setTimeout(() => setPhase('name'), 550);
    const t3 = setTimeout(() => setPhase('badge'), 550 + maxNameLen * 60 + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [maxNameLen]);

  const isSlideIn = phase !== 'hidden';
  const showName = phase === 'name' || phase === 'badge';
  const showBadge = phase === 'badge';

  // 뱃지 텍스트
  const badgeText = (() => {
    if (isCompound) {
      const names = npcs.map((n) => n.npcName).join(', ');
      return `첫 만남: ${names}`;
    }
    return npcs[0].isNewlyIntroduced ? '이름이 밝혀졌다' : '첫 만남';
  })();

  return (
    <div
      className="mb-3 flex flex-col gap-2 rounded-lg p-3 transition-all duration-500"
      style={{
        opacity: isSlideIn ? 1 : 0,
        transform: isSlideIn ? 'translateX(0)' : 'translateX(-20px)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* 초상화 가로 배열 */}
        <div className="flex shrink-0 items-center">
          {npcs.map((npc, idx) => (
            <div
              key={npc.npcId}
              className="relative h-20 w-20 overflow-hidden rounded-lg"
              style={{
                boxShadow: isSlideIn
                  ? '0 0 12px rgba(255, 215, 0, 0.3), 0 0 4px rgba(255, 215, 0, 0.2)'
                  : 'none',
                border: '2px solid var(--gold)',
                transition: 'box-shadow 0.8s ease-out',
                // 복합 카드 시 초상화 겹침 효과 (각 초상화 -8px 겹침)
                marginLeft: idx > 0 ? '-8px' : 0,
                zIndex: npcs.length - idx,
              }}
            >
              <Image
                src={npc.imageUrl}
                alt={npc.npcName}
                fill
                sizes="80px"
                className="object-cover"
              />
              {isSlideIn && idx === 0 && (
                <div
                  className="pointer-events-none absolute inset-0 animate-[npcShimmer_2s_ease-in-out]"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.15) 50%, transparent 60%)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          {/* 이름 리스트 */}
          {showName && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {npcs.map((npc, idx) => (
                <span
                  key={npc.npcId}
                  className="text-sm font-semibold font-display animate-[npcNameFade_0.4s_ease-out]"
                  style={{
                    color: 'var(--text-primary)',
                    animationDelay: `${idx * 150}ms`,
                  }}
                >
                  {npc.npcName}
                  {idx < npcs.length - 1 && (
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>,</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {/* 뱃지 */}
          {showBadge && (
            <span
              className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold animate-[npcBadgeBounce_0.4s_ease-out]"
              style={{
                color: 'var(--gold)',
                border: '1px solid var(--gold)',
                backgroundColor: 'rgba(255, 215, 0, 0.06)',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
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
  const isStreaming = useGameStore((s) => s.isStreaming);
  const streamSegments = useGameStore((s) => s.streamSegments);
  const streamDoneNarrative = useGameStore((s) => s.streamDoneNarrative);
  const streamTextBuffer = useGameStore((s) => s.streamTextBuffer);
  const finalizeStreaming = useGameStore((s) => s.finalizeStreaming);
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
                  streamDoneNarrative: null,
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
                  streamDoneNarrative: null,
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
