"use client";

import { useRef, useEffect, useCallback } from "react";
import { StoryBlock } from "./StoryBlock";
// StreamingBlock은 StoryBlock 내부에서 렌더링됨
import { useGameStore } from "@/store/game-store";
import type { StoryMessage } from "@/types/game";

/** 하단에서 이 거리 이내면 "따라가는 중"으로 보고 자동 스크롤을 재개한다. */
const FOLLOW_RESUME_PX = 32;

interface NarrativePanelProps {
  messages: StoryMessage[];
  onChoiceSelect?: (choiceId: string) => void;
  onNarrationComplete?: () => void;
  /** Optional id attribute for the scroll container (used for mobile scroll tracking) */
  scrollId?: string;
  /** architecture/42 — 전투 UI 버튼 폼에서는 NarrativePanel 선택지 숨김 (CombatActionBar가 대체) */
  hideChoices?: boolean;
  /**
   * 모바일 고정 헤더(h-12 + 상태줄 h-8 + 1px 보더 = 81px + safe-area) 아래로 첫 서술이 가려지는 것을 방지.
   * true 이면 스크롤 컨테이너 상단에 헤더 높이만큼 in-scroll 패딩을 준다 (스크롤 시 함께 밀려 헤더 자동숨김과 양립).
   */
  topInset?: boolean;
}

export function NarrativePanel({ messages, onChoiceSelect, onNarrationComplete, scrollId, hideChoices, topInset }: NarrativePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamSegments = useGameStore((s) => s.streamSegments);
  const lastMessage = messages.at(-1);
  const shouldForceChoiceIntoView =
    !hideChoices &&
    lastMessage?.type === "CHOICE" &&
    !!lastMessage.choices?.length &&
    !lastMessage.selectedChoiceId;

  // ── 하단 추적(follow) 모델 ─────────────────────────────────────────────
  // 구 구현은 "하단에서 100px 이상 떨어졌는가"만 봤다. 모바일 드래그는 100px
  // 미만이 흔해서, 조금만 위로 올리면 스트리밍 문장마다 하단으로 되끌려갔다
  // (실측: 60px 위 → DOM 변화 1회에 즉시 하단 복귀).
  //   ① 사용자 스크롤이 하단권(FOLLOW_RESUME_PX)을 벗어나면 추적을 끈다.
  //   ② 자동 스크롤이 만든 scroll 이벤트는 추적 판정에서 제외한다
  //      (programmaticUntil 창). 사용자 제스처가 오면 창을 즉시 무효화해
  //      "사용자 개입 우선"을 보장한다.
  //   ③ 손가락이 화면에 닿아 있는 동안에는 자동 스크롤을 하지 않는다
  //      (터치 드래그와 programmatic smooth scroll 경합 = 떨림의 원인).
  const followRef = useRef(true);
  const programmaticUntilRef = useRef(0);
  const touchingRef = useRef(false);

  // 추적 스크롤은 항상 instant(auto) — smooth 는 애니메이션이 수백 ms 지속되며
  // programmaticUntil 창을 계속 갱신해, 그 창 안에서 일어난 사용자 스와이프가
  // follow 해제 판정에서 무시되는 고착을 만든다 (버그리포트 cdb6742b: 서술 종료
  // 직후 위로 올려도 하단 복귀 반복). iOS 는 진행 중인 programmatic smooth 를
  // 터치로 중단하지 못해 체감이 "아예 안 올라감"이 된다.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticUntilRef.current = performance.now() + 80;
    el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (performance.now() < programmaticUntilRef.current) return; // 자동 스크롤이 만든 이벤트
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      followRef.current = distFromBottom <= FOLLOW_RESUME_PX;
    };
    // 사용자 제스처 = 추적 판정 권한을 사용자에게 넘김
    const onUserIntent = () => { programmaticUntilRef.current = 0; };
    const onTouchStart = () => { touchingRef.current = true; onUserIntent(); };
    const onTouchEnd = () => { touchingRef.current = false; };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onUserIntent, { passive: true });
    el.addEventListener('pointerdown', onUserIntent, { passive: true });
    el.addEventListener('keydown', onUserIntent);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onUserIntent);
      el.removeEventListener('pointerdown', onUserIntent);
      el.removeEventListener('keydown', onUserIntent);
    };
  }, []);

  // 메시지 변경 시 하단 추적 (사용자 스크롤 존중)
  //   bug 4749: 페이지 전환 시 3단계 강제 setTimeout 스크롤 제거.
  //   사용자가 위로 스크롤 해서 읽는 중이면 방해하지 않음.
  //   단, 새 선택지가 마지막 블록으로 열린 순간에는 조작 가능성이 우선이므로
  //   사용자 스크롤 상태와 무관하게 2-pass로 하단 노출을 보장한다.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!shouldForceChoiceIntoView && (!followRef.current || touchingRef.current)) return;

    scrollToBottom();
    if (shouldForceChoiceIntoView) {
      followRef.current = true;
      const rafId = window.requestAnimationFrame(() => scrollToBottom());
      const timeoutId = window.setTimeout(() => scrollToBottom(), 120);
      return () => {
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(timeoutId);
      };
    }
  }, [messages, streamSegments, shouldForceChoiceIntoView, scrollToBottom]);

  // 타이핑 애니메이션 중 내용 변화 시에도 스크롤 유지 (사용자 스크롤 존중)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const observer = new MutationObserver(() => {
      if (!followRef.current || touchingRef.current) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => scrollToBottom());
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      id={scrollId}
      data-narrative-scroll
      className={
        topInset
          ? "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-3 pb-20 pt-[calc(env(safe-area-inset-top)+5.0625rem)] md:px-6 md:pb-24"
          : "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-3 pb-20 md:p-6 md:pb-24 lg:p-6 lg:pb-24"
      }
    >
      {messages.map((msg) => (
        <StoryBlock key={msg.id} message={msg} onChoiceSelect={hideChoices ? undefined : onChoiceSelect} onNarrationComplete={onNarrationComplete} />
      ))}
      {/* StreamingBlock은 StoryBlock 내부에서 렌더링됨 (내레이터 박스 안) */}
    </div>
  );
}
