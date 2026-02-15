"use client";

import { useRef, useEffect } from "react";
import { StoryBlock } from "./StoryBlock";
import type { StoryMessage } from "@/types/game";

interface NarrativePanelProps {
  messages: StoryMessage[];
  onChoiceSelect?: (choiceId: string) => void;
  onNarrationComplete?: () => void;
}

export function NarrativePanel({ messages, onChoiceSelect, onNarrationComplete }: NarrativePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 메시지 변경 시 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 타이핑 애니메이션 중 내용 변화 시에도 스크롤 유지
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight;
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {messages.map((msg) => (
        <StoryBlock key={msg.id} message={msg} onChoiceSelect={onChoiceSelect} onNarrationComplete={onNarrationComplete} />
      ))}
    </div>
  );
}
