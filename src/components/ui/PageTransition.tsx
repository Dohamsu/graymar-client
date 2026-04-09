"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

type GamePhase = 'TITLE' | 'LOADING' | 'HUB' | 'LOCATION' | 'COMBAT' | 'NODE_TRANSITION' | 'RUN_ENDED' | 'ERROR';

const TRANSITIONS: Record<string, { exit: string; enter: string; duration: number }> = {
  'TITLE→HUB':        { exit: 'animate-[fadeToBlack_0.6s_ease-in_forwards]',    enter: 'animate-[fadeFromBlack_0.8s_ease-out]',  duration: 650 },
  'TITLE→LOADING':    { exit: 'animate-[fadeToBlack_0.6s_ease-in_forwards]',    enter: 'animate-[fadeFromBlack_0.8s_ease-out]',  duration: 650 },
  'LOADING→HUB':      { exit: 'animate-[fadeToBlack_0.4s_ease-in_forwards]',    enter: 'animate-[fadeFromBlack_0.6s_ease-out]',  duration: 450 },
  'LOADING→LOCATION': { exit: 'animate-[fadeToBlack_0.4s_ease-in_forwards]',    enter: 'animate-[fadeFromBlack_0.6s_ease-out]',  duration: 450 },
  'HUB→LOCATION':     { exit: 'animate-[slideOutLeft_0.4s_ease-in_forwards]',   enter: 'animate-[slideInRight_0.4s_ease-out]',   duration: 420 },
  'LOCATION→HUB':     { exit: 'animate-[slideOutRight_0.4s_ease-in_forwards]',  enter: 'animate-[slideInLeft_0.4s_ease-out]',    duration: 420 },
  'LOCATION→COMBAT':  { exit: 'animate-[combatFlash_0.5s_ease-in_forwards]',    enter: 'animate-[combatEnter_0.4s_ease-out]',    duration: 520 },
  'HUB→COMBAT':       { exit: 'animate-[combatFlash_0.5s_ease-in_forwards]',    enter: 'animate-[combatEnter_0.4s_ease-out]',    duration: 520 },
  'COMBAT→LOCATION':  { exit: 'animate-[combatFadeOut_0.5s_ease-out_forwards]', enter: 'animate-[fadeFromBlack_0.6s_ease-out]',  duration: 550 },
  'COMBAT→HUB':       { exit: 'animate-[combatFadeOut_0.5s_ease-out_forwards]', enter: 'animate-[fadeFromBlack_0.6s_ease-out]',  duration: 550 },
  'HUB→RUN_ENDED':      { exit: 'animate-[slowFadeToBlack_1s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_1.2s_ease-out]', duration: 1050 },
  'LOCATION→RUN_ENDED': { exit: 'animate-[slowFadeToBlack_1s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_1.2s_ease-out]', duration: 1050 },
  'COMBAT→RUN_ENDED':   { exit: 'animate-[slowFadeToBlack_1s_ease-in_forwards]', enter: 'animate-[fadeFromBlack_1.2s_ease-out]', duration: 1050 },
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
