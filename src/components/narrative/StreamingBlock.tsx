"use client";

import { memo } from "react";
import { DialogueBubble } from "./DialogueBubble";
import type { StreamOutput } from "@/lib/stream-parser";

interface StreamingBlockProps {
  segments: StreamOutput[];
}

/**
 * LLM 스트리밍 중 실시간 렌더링 블록.
 * StreamParser가 생산한 narration/dialogue 세그먼트를 순서대로 표시.
 * 스트리밍 완료 후 최종 서술(StoryBlock)로 교체된다.
 */
function StreamingBlockInner({ segments }: StreamingBlockProps) {
  if (segments.length === 0) return null;

  // 연속 narration 세그먼트를 하나의 텍스트로 병합
  const merged: Array<
    | { type: 'narration'; text: string }
    | { type: 'dialogue'; text: string; npcName: string; npcImage?: string }
  > = [];

  for (const seg of segments) {
    if (seg.type === 'narration') {
      const last = merged[merged.length - 1];
      if (last && last.type === 'narration') {
        last.text += seg.text;
      } else {
        merged.push({ type: 'narration', text: seg.text });
      }
    } else {
      merged.push({
        type: 'dialogue',
        text: seg.text,
        npcName: seg.npcName ?? '',
        npcImage: seg.npcImage,
      });
    }
  }

  // 연속 dialogue의 같은 NPC 카운트 (compact 판단용)
  const npcCounts = new Map<string, number>();

  return (
    <div className="space-y-1">
      {merged.map((item, idx) => {
        if (item.type === 'narration') {
          return (
            <span
              key={`sn-${idx}`}
              className="font-narrative leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-primary)" }}
            >
              {item.text}
            </span>
          );
        }

        // dialogue
        const count = npcCounts.get(item.npcName) ?? 0;
        npcCounts.set(item.npcName, count + 1);

        return (
          <DialogueBubble
            key={`sd-${idx}`}
            text={item.text}
            npcName={item.npcName}
            npcImageUrl={item.npcImage}
            compact={count > 0}
          />
        );
      })}
      {/* 커서 깜빡임 */}
      <span
        className="inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
        style={{ backgroundColor: "var(--gold)", opacity: 0.7 }}
      />
    </div>
  );
}

export const StreamingBlock = memo(StreamingBlockInner);
