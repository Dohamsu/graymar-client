"use client";

import { memo, useState, useEffect, useRef, useMemo } from "react";
import { DialogueBubble } from "./DialogueBubble";
import type { StreamOutput } from "@/lib/stream-parser";
import {
  TEXT_SPEED_PRESETS,
  getTypingDelay,
  useSettingsStore,
} from "@/store/settings-store";

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

/**
 * LLM 스트리밍 중 실시간 렌더링 블록.
 *
 * 서버에서 문장 단위로 세그먼트가 도착하면,
 * 각 세그먼트를 타이핑 효과로 한 글자씩 표시한다.
 * 대사(dialogue)는 타이핑 완료 후 말풍선으로 즉시 표시.
 *
 * 타이핑 속도/구두점 규칙은 settings-store 의 getTypingDelay 와 공유
 * (StreamTyper / TypewriterText 동일 리듬).
 */
function StreamingBlockInner({ segments, onComplete, isDone }: StreamingBlockProps) {
  const textSpeed = useSettingsStore((s) => s.textSpeed);
  const preset = TEXT_SPEED_PRESETS[textSpeed];
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
      // 세그먼트 완료 — 마지막 글자 기반 pause 후 다음 세그먼트로.
      // 서버가 문장 단위로 세그먼트를 분할하므로, 문장 끝의 마침표는 항상
      // 세그먼트 말미에 위치한다. 여기서 pause 를 걸지 않으면 다음 문장이
      // 연속해 붙어 리듬이 사라진다.
      const endDelay = getTypingDelay(
        currentText,
        currentText.length,
        preset,
      );
      const nextSeg = segments[typedCount + 1];
      const pauseAfter = nextSeg?.paragraphStart
        ? Math.max(endDelay, preset.paragraphPause)
        : endDelay;

      if (pauseAfter === 0) {
        setTypedCount((c) => c + 1);
        setCharIdx(0);
        return;
      }

      timerRef.current = setTimeout(() => {
        setTypedCount((c) => c + 1);
        setCharIdx(0);
      }, pauseAfter);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // charIdx 는 "지금까지 표시된 글자 수" = "다음에 표시할 글자의 인덱스".
    // getTypingDelay(text, pos) 는 pos-1 위치 글자(방금 표시한 글자) 기준 대기 시간.
    // charIdx=0 이면 아직 표시한 글자 없음 → 기본 charSpeed 반환.
    const delay = getTypingDelay(currentText, charIdx, preset);

    // instant 모드: 즉시 전부 표시
    if (delay === 0) {
      setCharIdx(currentText.length);
      return;
    }

    timerRef.current = setTimeout(() => {
      setCharIdx((c) => c + 1);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentText, charIdx, typedCount, preset]);

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

  // 문단 그룹화 (bug 4743): 연속 narration 은 하나의 문단으로 병합,
  //   dialogue 는 독립 블록. Phase 1 과 Phase 2 (analyzeText) 동일 구조.
  //
  // segIdx 는 원본 segments 배열의 인덱스 (타이핑 진행도 판단용).
  type ParaGroup =
    | { type: 'narration'; parts: { segIdx: number; text: string }[] }
    | { type: 'dialogue'; segIdx: number; text: string; npcName?: string; npcImage?: string };

  const groups: ParaGroup[] = [];
  let currentNarr: { segIdx: number; text: string }[] = [];
  segments.forEach((seg, idx) => {
    // 문단 경계 (bug 4751): paragraphStart=true 이면 현재 narr 그룹 flush
    if (seg.paragraphStart && currentNarr.length > 0) {
      groups.push({ type: 'narration', parts: currentNarr });
      currentNarr = [];
    }
    if (seg.type === 'dialogue') {
      if (currentNarr.length > 0) {
        groups.push({ type: 'narration', parts: currentNarr });
        currentNarr = [];
      }
      groups.push({
        type: 'dialogue',
        segIdx: idx,
        text: seg.text,
        npcName: seg.npcName,
        npcImage: seg.npcImage,
      });
    } else {
      const cleaned = cleanStreamText(seg.text);
      if (cleaned) currentNarr.push({ segIdx: idx, text: cleaned });
    }
  });
  if (currentNarr.length > 0) {
    groups.push({ type: 'narration', parts: currentNarr });
  }

  // 연속 dialogue 의 같은 NPC 카운트 (compact 판단용)
  const npcCounts = new Map<string, number>();

  return (
    <div className="space-y-3">
      {groups.map((group, gIdx) => {
        if (group.type === 'dialogue') {
          const count = npcCounts.get(group.npcName ?? '') ?? 0;
          npcCounts.set(group.npcName ?? '', count + 1);

          // 타이핑 진행도
          const isCompleted = group.segIdx < typedCount;
          const isCurrent = group.segIdx === typedCount;
          const displayText = isCompleted
            ? group.text
            : isCurrent
              ? group.text.slice(0, charIdx)
              : '';

          // 아직 도달 안 한 dialogue 는 말풍선 프레임만 먼저 표시 (npcName 있으면)
          if (!isCompleted && !isCurrent) {
            // 도달 전 — 렌더 안 함 (프레임 미리 보여주면 이상할 수 있음)
            return null;
          }

          return (
            <DialogueBubble
              key={`g-${gIdx}`}
              text={displayText}
              npcName={group.npcName ?? ''}
              npcImageUrl={group.npcImage}
              compact={count > 0}
            />
          );
        }

        // narration 그룹 — 연속 narration 을 한 문단으로 병합
        const mergedParts = group.parts.map((p) => {
          if (p.segIdx < typedCount) return p.text; // 완료
          if (p.segIdx === typedCount) return p.text.slice(0, charIdx); // 타이핑 중
          return ''; // 미도달
        });
        const merged = mergedParts.join(' ').replace(/\s+/g, ' ').trim();
        if (!merged) return null;

        // 타이핑 중인지 판단 (마지막 part 가 현재 segment 인 경우)
        const lastPart = group.parts[group.parts.length - 1];
        const isTyping = lastPart.segIdx === typedCount && charIdx < lastPart.text.length;
        const hasInProgress = group.parts.some((p) => p.segIdx === typedCount);

        return (
          <p
            key={`g-${gIdx}`}
            className="font-narrative leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-primary)' }}
          >
            {merged}
            {(isTyping || hasInProgress) && (
              <span
                className="ml-0.5 inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
                style={{ backgroundColor: 'var(--gold)', opacity: 0.7 }}
              />
            )}
          </p>
        );
      })}

      {/* 타이핑 대기 중 (세그먼트 끝, 다음 기다리는 중) 커서만 */}
      {typedCount >= segments.length && segments.length > 0 && !isDone && (
        <span
          className="inline-block w-[2px] h-[1em] align-text-bottom animate-pulse"
          style={{ backgroundColor: 'var(--gold)', opacity: 0.5 }}
        />
      )}
    </div>
  );
}

export const StreamingBlock = memo(StreamingBlockInner);
