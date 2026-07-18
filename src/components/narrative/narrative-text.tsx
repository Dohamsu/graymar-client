"use client";
// [arch/77 P5c] 서술 텍스트 렌더 유틸 정본 — StoryBlock.tsx에서 분리.
// 마커 정리(cleanResidualMarkers)·세그먼트 파싱·서술/대사 스타일 렌더.
// StreamTyper/TypewriterText/StreamingBlock이 동일 규칙을 공유한다.
import type { StoryMessage } from "@/types/game";
import { DialogueBubble } from "./DialogueBubble";

type SpeakingNpc = NonNullable<StoryMessage["speakingNpc"]>;

export const LABEL_COLORS: Record<string, string> = {
  SYSTEM: "var(--gold)",
  NARRATOR: "var(--success-green)",
  PLAYER: "var(--text-secondary)",
  CHOICE: "var(--info-blue)",
};

export const LABEL_TEXT: Record<string, string> = {
  SYSTEM: "시스템",
  NARRATOR: "내레이터",
  PLAYER: "행동",
  CHOICE: "무엇을 하겠는가?",
};

export function renderInlineText(text: string, keyBase: number): { nodes: React.ReactNode[]; nextKey: number } {
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
export function renderNarrationLines(text: string, keyBase: string): React.ReactNode[] {
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
export function cleanResidualMarkers(text: string): string {
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
    (_match, q: string, space: string) => `${q}${space}`,
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

export function renderStyledText(text: string, speakingNpc?: SpeakingNpc): React.ReactNode {
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
  // arch/68 부록 K — 마커가 한 번이라도 등장한 턴에서는 이후 무마커 대사에
  // speakingNpc(대표 화자) 초상화를 상속하지 않는다. 마커 화자와 배경 인물
  // (행상인 두 명 등)이 섞인 턴에서 배경 대사에 대표 화자 초상이 오귀속되던
  // 버그(f4bf2e66) 방지. 마커가 전혀 없는 턴은 기존대로 speakingNpc fallback.
  let markerSeenInTurn = false;

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

    if (markerName) markerSeenInTurn = true;

    // NPC 이름 결정: @[이름] 마커 > (마커 미등장 턴 한정) speakingNpc fallback
    //   마커가 이미 나온 턴의 무마커 대사는 배경 인물 → 무명 처리.
    const npcName =
      markerName ||
      (markerSeenInTurn ? '무명 인물' : speakingNpc?.displayName || '무명 인물');
    // 초상화: @[이름|URL]의 URL > (마커 미등장 턴 한정) speakingNpc fallback
    const npcImage = markerName
      ? markerImage // 마커에 초상화 URL 포함 (소개된 NPC만)
      : markerSeenInTurn
        ? undefined // 마커 화자 뒤 배경 대사 — 초상화 상속 금지
        : speakingNpc?.imageUrl;

    // 연속 대사 카운트 (같은 NPC면 compact = 헤더 생략 묶음)
    const count = npcBubbleCounts.get(npcName) ?? 0;
    npcBubbleCounts.set(npcName, count + 1);

    // 무명 인물은 compact로 묶지 않는다 (arch/68 부록 K 후속) — 서버가 배경
    // 화자를 구분해 주지 않아 여러 명이 전부 "무명 인물"로 뭉치므로, 묶으면
    // 서로 다른 발화가 한 사람의 연속 대사처럼 보인다. 각 대사를 독립 실루엣
    // 버블로 분리해 "여러 명이 말한다"는 것이 드러나게 한다.
    const isAnonymous = npcName === '무명 인물';
    const compact = !isAnonymous && count > 0;

    const strippedDialogue = rawDialogue.replace(/^[""\u201C]|[""\u201D]$/g, '').trim();
    if (strippedDialogue) {
      segments.push(
        <DialogueBubble
          key={`bubble-${key++}`}
          text={strippedDialogue}
          npcName={npcName}
          npcImageUrl={npcImage}
          compact={compact}
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

export function NarratorContent({ text, speakingNpc }: { text: string; speakingNpc?: SpeakingNpc }) {
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
export function NarratorContentWithFlush({ text, speakingNpc }: { text: string; speakingNpc?: SpeakingNpc; onReady?: () => void }) {
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

export function parseNarrativeSegments(text: string): NarrSegment[] {
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
