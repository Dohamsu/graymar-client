"use client";

import { useRef, useEffect, useCallback } from "react";
import { StoryBlock } from "./StoryBlock";
import { isPageTransitioning } from "@/components/ui/PageTransition";
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

  // 메시지 변경 시 스크롤 (사용자가 위로 스크롤한 상태면 스킵, 페이지 전환 중이면 스킵)
  useEffect(() => {
    if (scrollRef.current && !isUserScrolledUp.current && !isPageTransitioning) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // 타이핑 애니메이션 중 내용 변화 시에도 스크롤 유지 (사용자 스크롤/페이지 전환 존중)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (isUserScrolledUp.current || isPageTransitioning) return;
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
        <StoryBlock key={msg.id} message={msg} onChoiceSelect={onChoiceSelect} onNarrationComplete={onNarrationComplete} />
      ))}
    </div>
  );
}
