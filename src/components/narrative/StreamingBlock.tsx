"use client";

import { memo, useState, useEffect, useRef, useMemo } from "react";
import { DialogueBubble } from "./DialogueBubble";
import type { StreamOutput } from "@/lib/stream-parser";

interface StreamingBlockProps {
  segments: StreamOutput[];
  /** 모든 세그먼트 타이핑 완료 + done 수신 후 호출 */
  onComplete?: () => void;
  /** done 이벤트가 수신되었는지 (더 이상 세그먼트가 오지 않음) */
  isDone?: boolean;
}

/** 스트리밍 원문에서 시스템 태그와 @마커를 제거 */
function cleanStreamText(text: string): string {
  return text
    .replace(/@\[[^\]]*\]\s*/g, '')          // @[NPC이름|URL] 제거
    .replace(/@[A-Z][A-Z_0-9]+\s*/g, '')     // @NPC_ID 제거
    .replace(/\[CHOICES\][\s\S]*?\[\/CHOICES\]/g, '') // [CHOICES]...[/CHOICES] 블록 제거
    .replace(/\[THREAD\][\s\S]*/g, '')        // [THREAD] 이후 전부 제거
    .replace(/\[MEMORY\][\s\S]*?\[\/MEMORY\]/g, '')   // [MEMORY] 블록 제거
    .replace(/\[[A-Z_]+\]/g, '')              // 기타 [TAG] 제거
    .replace(/\n{3,}/g, '\n\n')              // 연속 빈 줄 정리
    .trim();
}

/** 타이핑 속도 (ms/글자) */
const CHAR_SPEED = 25;
/** 구두점 후 추가 딜레이 */
const PUNCT_DELAY = 80;

/**
 * LLM 스트리밍 중 실시간 렌더링 블록.
 *
 * 서버에서 문장 단위로 세그먼트가 도착하면,
 * 각 세그먼트를 타이핑 효과로 한 글자씩 표시한다.
 * 대사(dialogue)는 타이핑 완료 후 말풍선으로 즉시 표시.
 */
function StreamingBlockInner({ segments, onComplete, isDone }: StreamingBlockProps) {
  // 타이핑 완료된 세그먼트 수
  const [typedCount, setTypedCount] = useState(0);
  // 현재 타이핑 중인 세그먼트의 표시 글자 수
  const [charIdx, setCharIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 현재 타이핑 중인 세그먼트 텍스트 (정제 후, 메모이즈)
  const currentText = useMemo(() => {
    const raw = segments[typedCount] as StreamOutput | undefined;
    if (!raw) return '';
    if (raw.type === 'narration') return cleanStreamText(raw.text);
    return raw.text;
  }, [segments, typedCount]);

  const currentSegType = (segments[typedCount] as StreamOutput | undefined)?.type;
  const currentSegNpcName = (segments[typedCount] as StreamOutput | undefined)?.npcName;
  const currentSegNpcImage = (segments[typedCount] as StreamOutput | undefined)?.npcImage;

  useEffect(() => {
    if (!currentText) return;

    // 빈 텍스트(정제 후 빈 문자열) → 건너뜀
    if (currentText.length === 0) {
      setTypedCount((c) => c + 1);
      setCharIdx(0);
      return;
    }

    if (charIdx >= currentText.length) {
      // 현재 세그먼트 타이핑 완료 → 다음으로
      setTypedCount((c) => c + 1);
      setCharIdx(0);
      return;
    }

    const char = currentText[charIdx];
    const isPunct = /[.!?。,，;；]/.test(char);
    const delay = isPunct ? CHAR_SPEED + PUNCT_DELAY : CHAR_SPEED;

    timerRef.current = setTimeout(() => {
      setCharIdx((c) => c + 1);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentText, charIdx, typedCount]);

  // 모든 세그먼트 타이핑 완료 + done 수신 → onComplete 호출
  const allTyped = typedCount >= segments.length && segments.length > 0;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (allTyped && isDone) {
      onCompleteRef.current?.();
    }
  }, [allTyped, isDone]);

  if (segments.length === 0) return null;

  // 연속 dialogue의 같은 NPC 카운트 (compact 판단용)
  const npcCounts = new Map<string, number>();

  return (
    <div className="space-y-1">
      {/* 타이핑 완료된 세그먼트 — 전체 표시 */}
      {segments.slice(0, typedCount).map((seg, idx) => {
        if (seg.type === "narration") {
          const cleaned = cleanStreamText(seg.text);
          if (!cleaned) return null;
          return (
            <span
              key={`sn-${idx}`}
              className="font-narrative leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-primary)" }}
            >
              {cleaned}
            </span>
          );
        }

        const count = npcCounts.get(seg.npcName ?? "") ?? 0;
        npcCounts.set(seg.npcName ?? "", count + 1);
        return (
          <DialogueBubble
            key={`sd-${idx}`}
            text={seg.text}
            npcName={seg.npcName ?? ""}
            npcImageUrl={seg.npcImage}
            compact={count > 0}
          />
        );
      })}

      {/* 현재 타이핑 중인 세그먼트 — 부분 표시 */}
      {currentText && charIdx > 0 && (
        currentSegType === "narration" ? (
          <span
            className="font-narrative leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-primary)" }}
          >
            {currentText.slice(0, charIdx)}
            <span
              className="inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
              style={{ backgroundColor: "var(--gold)", opacity: 0.7 }}
            />
          </span>
        ) : (
          <DialogueBubble
            text={currentText.slice(0, charIdx)}
            npcName={currentSegNpcName ?? ""}
            npcImageUrl={currentSegNpcImage}
            compact={(npcCounts.get(currentSegNpcName ?? "") ?? 0) > 0}
          />
        )
      )}

      {/* 타이핑 대기 중 (세그먼트 없을 때) 커서만 */}
      {!currentText && typedCount >= segments.length && (
        <span
          className="inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
          style={{ backgroundColor: "var(--gold)", opacity: 0.7 }}
        />
      )}
    </div>
  );
}

export const StreamingBlock = memo(StreamingBlockInner);
