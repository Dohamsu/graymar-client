"use client";

import { useRef, useEffect } from "react";
import { StoryBlock } from "./StoryBlock";
import type { StoryMessage } from "@/types/game";

interface NarrativePanelProps {
  messages: StoryMessage[];
  onChoiceSelect?: (choiceId: string) => void;
}

export function NarrativePanel({ messages, onChoiceSelect }: NarrativePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {messages.map((msg) => (
        <StoryBlock key={msg.id} message={msg} onChoiceSelect={onChoiceSelect} />
      ))}
    </div>
  );
}
