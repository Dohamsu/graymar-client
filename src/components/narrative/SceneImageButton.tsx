"use client";
// [arch/77 P5c] 장면 이미지 버튼 + 로딩 — StoryBlock.tsx에서 분리.
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useGameStore } from "@/store/game-store";

const SCENE_LOADING_MSGS = [
  "장면을 그리는 중...",
  "배경에 색을 입히는 중...",
  "빛과 그림자를 조율하는 중...",
  "분위기를 완성하는 중...",
];

function SceneImageLoading() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % SCENE_LOADING_MSGS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" />
      <span className="text-xs text-[var(--text-muted)] animate-pulse">{SCENE_LOADING_MSGS[msgIdx]}</span>
    </div>
  );
}

function extractTurnNo(messageId: string): number | null {
  const match = messageId.match(/^narrator-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function SceneImageButton({ messageId }: { messageId: string }) {
  const turnNo = extractTurnNo(messageId);
  const sceneImages = useGameStore((s) => s.sceneImages);
  const sceneImageRemaining = useGameStore((s) => s.sceneImageRemaining);
  const sceneImageLoading = useGameStore((s) => s.sceneImageLoading);
  const requestSceneImage = useGameStore((s) => s.requestSceneImage);

  const [fadeIn, setFadeIn] = useState(false);

  const imageUrl = turnNo !== null ? sceneImages[turnNo] : undefined;
  const isLoading = turnNo !== null ? !!sceneImageLoading[turnNo] : false;
  const isExhausted = sceneImageRemaining <= 0;

  const handleClick = useCallback(() => {
    if (turnNo === null || isLoading || imageUrl) return;
    requestSceneImage(turnNo);
  }, [turnNo, isLoading, imageUrl, requestSceneImage]);

  useEffect(() => {
    if (imageUrl) {
      const timer = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [imageUrl]);

  if (turnNo === null) return null;

  // Already generated — show image
  if (imageUrl) {
    return (
      <div className="mt-3">
        <div
          className="relative w-full overflow-hidden rounded-lg transition-opacity duration-700"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          <Image
            src={imageUrl}
            alt="장면 이미지"
            width={768}
            height={432}
            className="h-auto w-full rounded-lg"
            unoptimized
          />
        </div>
      </div>
    );
  }

  // Loading state with rotating messages
  if (isLoading) {
    return <SceneImageLoading />;
  }

  // Button
  return (
    <button
      onClick={handleClick}
      disabled={isExhausted}
      className="mt-2 cursor-pointer rounded px-2 py-1 text-xs transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        color: isExhausted ? 'var(--text-muted)' : 'var(--gold)',
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${isExhausted ? 'var(--border-primary)' : 'var(--gold)'}`,
      }}
    >
      {isExhausted ? '이미지 생성 한도 초과' : '\uD83C\uDFA8 장면 그리기'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NpcPortraitCard — NPC 초상화 카드 (NARRATOR 메시지 상단)
// ---------------------------------------------------------------------------
