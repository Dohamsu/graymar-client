"use client";

import { memo, useState, useEffect, useRef } from "react";
import { DialogueBubble } from "./DialogueBubble";
import type { StreamOutput } from "@/lib/stream-parser";

interface StreamingBlockProps {
  segments: StreamOutput[];
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
function StreamingBlockInner({ segments }: StreamingBlockProps) {
  // 타이핑 완료된 세그먼트 수
  const [typedCount, setTypedCount] = useState(0);
  // 현재 타이핑 중인 세그먼트의 표시 글자 수
  const [charIdx, setCharIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 현재 타이핑 중인 세그먼트
  const currentSeg = segments[typedCount] as StreamOutput | undefined;

  useEffect(() => {
    if (!currentSeg) return;

    // narration/dialogue 모두 타이핑
    const text = currentSeg.text;
    if (charIdx >= text.length) {
      // 현재 세그먼트 타이핑 완료 → 다음으로
      setTypedCount((c) => c + 1);
      setCharIdx(0);
      return;
    }

    const char = text[charIdx];
    const isPunct = /[.!?。,，;；]/.test(char);
    const delay = isPunct ? CHAR_SPEED + PUNCT_DELAY : CHAR_SPEED;

    timerRef.current = setTimeout(() => {
      setCharIdx((c) => c + 1);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSeg, charIdx, typedCount]);

  // 새 세그먼트가 추가될 때 (segments 길이 변경) — 타이핑을 이어감
  // typedCount/charIdx는 유지하므로 자연스럽게 큐 처리됨

  if (segments.length === 0) return null;

  // 연속 dialogue의 같은 NPC 카운트 (compact 판단용)
  const npcCounts = new Map<string, number>();

  return (
    <div className="space-y-1">
      {/* 타이핑 완료된 세그먼트 — 전체 표시 */}
      {segments.slice(0, typedCount).map((seg, idx) => {
        if (seg.type === "narration") {
          return (
            <span
              key={`sn-${idx}`}
              className="font-narrative leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-primary)" }}
            >
              {seg.text}
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
      {currentSeg && charIdx > 0 && (
        currentSeg.type === "narration" ? (
          <span
            className="font-narrative leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-primary)" }}
          >
            {currentSeg.text.slice(0, charIdx)}
            <span
              className="inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
              style={{ backgroundColor: "var(--gold)", opacity: 0.7 }}
            />
          </span>
        ) : (
          <DialogueBubble
            text={currentSeg.text.slice(0, charIdx)}
            npcName={currentSeg.npcName ?? ""}
            npcImageUrl={currentSeg.npcImage}
            compact={(npcCounts.get(currentSeg.npcName ?? "") ?? 0) > 0}
          />
        )
      )}

      {/* 타이핑 대기 중 (세그먼트 없을 때) 커서만 */}
      {!currentSeg && typedCount >= segments.length && (
        <span
          className="inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
          style={{ backgroundColor: "var(--gold)", opacity: 0.7 }}
        />
      )}
    </div>
  );
}

export const StreamingBlock = memo(StreamingBlockInner);
