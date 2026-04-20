"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

type GamePhase = 'TITLE' | 'LOADING' | 'HUB' | 'LOCATION' | 'COMBAT' | 'NODE_TRANSITION' | 'RUN_ENDED' | 'ERROR' | 'ENDINGS_LIST' | 'ENDINGS_DETAIL';

const FADE_SHORT = { exit: 'animate-[fadeToBlack_0.3s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_0.4s_ease-out]', duration: 320 };
const FADE_MED   = { exit: 'animate-[fadeToBlack_0.4s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_0.6s_ease-out]', duration: 450 };
const FADE_LONG  = { exit: 'animate-[slowFadeToBlack_1s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_1.2s_ease-out]', duration: 1050 };

const NONE = { exit: '', enter: '', duration: 0 };

const TRANSITIONS: Record<string, { exit: string; enter: string; duration: number }> = {
  'TITLE→HUB':        FADE_MED,
  'TITLE→LOADING':    FADE_MED,
  'LOADING→HUB':      FADE_MED,
  'LOADING→LOCATION': FADE_MED,
  'HUB→LOCATION':     NONE,
  'LOCATION→HUB':     NONE,
  'LOCATION→COMBAT':  FADE_SHORT,
  'HUB→COMBAT':       FADE_SHORT,
  'COMBAT→LOCATION':  FADE_MED,
  'COMBAT→HUB':       FADE_MED,
  'HUB→RUN_ENDED':      FADE_LONG,
  'LOCATION→RUN_ENDED': FADE_LONG,
  'COMBAT→RUN_ENDED':   FADE_LONG,
  // Journey Archive
  'TITLE→ENDINGS_LIST':            FADE_MED,
  'ENDINGS_LIST→ENDINGS_DETAIL':   FADE_MED,
  'ENDINGS_DETAIL→ENDINGS_LIST':   FADE_SHORT,
  'ENDINGS_LIST→TITLE':            FADE_MED,
  'ENDINGS_DETAIL→TITLE':          FADE_MED,
};

const DEFAULT_TRANSITION = { exit: 'animate-[fadeToBlack_0.3s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_0.4s_ease-out]', duration: 320 };

/** 전환 중 여부를 외부에서 확인할 수 있도록 노출 */
export let isPageTransitioning = false;

export function PageTransition({ phase, children }: { phase: GamePhase; children: ReactNode }) {
  const [animClass, setAnimClass] = useState('');
  const [frozenChildren, setFrozenChildren] = useState<ReactNode>(null);
  const prevPhaseRef = useRef(phase);
  const transitioning = useRef(false);

  // phase 변경 감지 즉시 플래그 설정 (useEffect보다 먼저 실행 — 동기적)
  if (phase !== prevPhaseRef.current && !transitioning.current) {
    isPageTransitioning = true;
  }

  useEffect(() => {
    if (phase === prevPhaseRef.current) return;
    if (transitioning.current) {
      // 전환 중 또 바뀌면 즉시 완료 처리
      prevPhaseRef.current = phase;
      transitioning.current = false;
      isPageTransitioning = false;
      setAnimClass('');
      setFrozenChildren(null);
      return;
    }

    const key = `${prevPhaseRef.current}→${phase}`;
    const trans = TRANSITIONS[key] ?? DEFAULT_TRANSITION;
    transitioning.current = true;
    isPageTransitioning = true;

    // 현재 children 동결 (exit 애니메이션 동안 화면 유지)
    setFrozenChildren(children);
    setAnimClass(trans.exit);

    const exitTimer = setTimeout(() => {
      // exit 완료 → enter 시작 (동결 해제, 새 children 표시)
      setFrozenChildren(null);
      setAnimClass(trans.enter);

      const enterTimer = setTimeout(() => {
        setAnimClass('');
        transitioning.current = false;
        isPageTransitioning = false;
        prevPhaseRef.current = phase;
      }, trans.duration);

      return () => clearTimeout(enterTimer);
    }, trans.duration);

    return () => {
      clearTimeout(exitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div
      className={`h-full w-full overflow-hidden ${animClass}`}
      style={{ willChange: animClass ? 'transform, opacity, filter' : 'auto' }}
    >
      {frozenChildren ?? children}
    </div>
  );
}
