"use client";

import { useRef, useEffect, useCallback } from "react";
import { StoryBlock } from "./StoryBlock";
// StreamingBlock은 StoryBlock 내부에서 렌더링됨
import { useGameStore } from "@/store/game-store";
import type { StoryMessage } from "@/types/game";

interface NarrativePanelProps {
  messages: StoryMessage[];
  onChoiceSelect?: (choiceId: string) => void;
  onNarrationComplete?: () => void;
  /** Optional id attribute for the scroll container (used for mobile scroll tracking) */
  scrollId?: string;
  /** architecture/42 — 전투 UI 버튼 폼에서는 NarrativePanel 선택지 숨김 (CombatActionBar가 대체) */
  hideChoices?: boolean;
}

export function NarrativePanel({ messages, onChoiceSelect, onNarrationComplete, scrollId, hideChoices }: NarrativePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = useGameStore((s) => s.isStreaming);
  const streamSegments = useGameStore((s) => s.streamSegments);

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

  // 메시지 변경 시 하단 추적 (사용자 스크롤 존중)
  //   bug 4749: 페이지 전환 시 3단계 강제 setTimeout 스크롤 제거.
  //   사용자가 위로 스크롤 해서 읽는 중이면 방해하지 않음.
  //   MutationObserver 가 타이핑 중 콘텐츠 변화에 따라 자연스럽게 추적.
  useEffect(() => {
    if (!scrollRef.current) return;
    if (isUserScrolledUp.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streamSegments]);

  // 타이핑 애니메이션 중 내용 변화 시에도 스크롤 유지 (사용자 스크롤 존중)
  //   bug 4749: 항상 smooth 로 통일. 페이지 전환 시 즉시 점프 제거.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (isUserScrolledUp.current) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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
        <StoryBlock key={msg.id} message={msg} onChoiceSelect={hideChoices ? undefined : onChoiceSelect} onNarrationComplete={onNarrationComplete} />
      ))}
      {/* StreamingBlock은 StoryBlock 내부에서 렌더링됨 (내레이터 박스 안) */}
    </div>
  );
}
