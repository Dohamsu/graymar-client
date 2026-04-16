"use client";

import { useRef, useEffect, useCallback } from "react";
import { StoryBlock } from "./StoryBlock";
import { StreamingBlock } from "./StreamingBlock";
import { isPageTransitioning } from "@/components/ui/PageTransition";
import { useGameStore } from "@/store/game-store";
import type { StoryMessage } from "@/types/game";

interface NarrativePanelProps {
  messages: StoryMessage[];
  onChoiceSelect?: (choiceId: string) => void;
  onNarrationComplete?: () => void;
  /** Optional id attribute for the scroll container (used for mobile scroll tracking) */
  scrollId?: string;
}

export function NarrativePanel({ messages, onChoiceSelect, onNarrationComplete, scrollId }: NarrativePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = useGameStore((s) => s.isStreaming);
  const streamSegments = useGameStore((s) => s.streamSegments);
  const streamDoneNarrative = useGameStore((s) => s.streamDoneNarrative);
  const finalizeStreaming = useGameStore((s) => s.finalizeStreaming);

  // 사용자가 위로 스크롤했는지 감지 (하단에서 100px 이상 떨어지면 "위로 스크롤" 판정)
  const isUserScrolledUp = useRef(false);

  const handleScrollEvent = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.current = distFromBottom > 100;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScrollEvent, { passive: true });
    return () => el.removeEventListener('scroll', handleScrollEvent);
  }, [handleScrollEvent]);

  // 메시지 변경 시 스크롤 — 페이지 전환 직후에는 다단계 지연 실행
  useEffect(() => {
    if (!scrollRef.current) return;
    // 페이지 전환(장소 이동) 시 스크롤 상태 리셋 — 항상 하단으로
    if (isPageTransitioning) {
      isUserScrolledUp.current = false;
    }
    if (isUserScrolledUp.current) return;
    // 페이지 전환 중이면 전환 완료 후 다단계 스크롤 (콘텐츠 렌더링 보장)
    if (isPageTransitioning) {
      const scrollToBottom = () => {
        if (scrollRef.current && !isUserScrolledUp.current) {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
        }
      };
      // 1단계: 전환 직후 즉시 스크롤
      const t1 = setTimeout(scrollToBottom, 800);
      // 2단계: 콘텐츠 렌더링 후 보정 스크롤
      const t2 = setTimeout(scrollToBottom, 1500);
      // 3단계: 타이핑 시작 후 최종 보정
      const t3 = setTimeout(scrollToBottom, 2500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    // 일반 스크롤
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamSegments]);

  // 타이핑 애니메이션 중 내용 변화 시에도 스크롤 유지 (사용자 스크롤 존중)
  // 페이지 전환 완료 후에도 즉시 스크롤 추적 시작 (콘텐츠 높이 변화 감지)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (isUserScrolledUp.current) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: isPageTransitioning ? 'auto' : 'smooth' });
      });
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={scrollRef} id={scrollId} className="flex flex-1 flex-col gap-4 overflow-y-auto p-3 pb-20 md:p-6 md:pb-24 lg:p-6 lg:pb-24">
      {messages.map((msg) => (
        <StoryBlock key={msg.id} message={msg} onChoiceSelect={onChoiceSelect} onNarrationComplete={onNarrationComplete} />
      ))}
      {isStreaming && streamSegments.length > 0 && (
        <StreamingBlock
          segments={streamSegments}
          isDone={!!streamDoneNarrative}
          onComplete={() => {
            finalizeStreaming();
            onNarrationComplete?.();
          }}
        />
      )}
    </div>
  );
}
