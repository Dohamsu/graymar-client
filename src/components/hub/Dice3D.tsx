"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 3D 큐브 주사위 굴림 연출 (2026-08-06 — 소유자 A안 채택).
 * preserve-3d 큐브가 여러 바퀴 구르다 굴린 눈(finalValue)이 정면으로 착지한다.
 * 이미지 에셋·외부 라이브러리 없이 CSS 변환만 사용 (구조·질감은 globals.css
 * .dice3d-* 정본). 구 연출(유니코드 flicker DiceRolling)을 대체.
 */

/** 눈별 착지 회전 — 해당 면이 정면(+Z)을 보도록 하는 [rotateX, rotateY] */
const FACE_TARGET: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  2: [90, 0],
};

/** 도트 패턴 — 3x3 그리드에서 켜지는 셀 인덱스 */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** 큐브 6면 배치 transform (translateZ = 변 길이 절반) */
const FACE_PLACEMENT: Record<number, string> = {
  1: "rotateY(0deg) translateZ(36px)",
  6: "rotateY(180deg) translateZ(36px)",
  3: "rotateY(90deg) translateZ(36px)",
  4: "rotateY(-90deg) translateZ(36px)",
  5: "rotateX(90deg) translateZ(36px)",
  2: "rotateX(-90deg) translateZ(36px)",
};

const TUMBLE_MS = 1150;
const SETTLE_MS = 250;
/** 굴림 시작→착지 완료까지 — ResolveOutcomeInline의 결과 공개 타이밍 기준 */
export const DICE3D_TOTAL_MS = TUMBLE_MS + SETTLE_MS;

/** 대기 자세(살짝 기운 등각) — 착지 후에도 유지해 정적인 정면 카드를 피한다 */
const IDLE_TILT: [number, number] = [-14, 22];

function Face({ value }: { value: number }) {
  return (
    <div className="dice3d-face" style={{ transform: FACE_PLACEMENT[value] }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="dice3d-pip"
          style={PIPS[value]?.includes(i) ? undefined : { opacity: 0 }}
        />
      ))}
    </div>
  );
}

export function Dice3D({ finalValue }: { finalValue: number }) {
  const value = FACE_TARGET[finalValue] ? finalValue : 1;
  const cubeRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  // reduced-motion이면 텀블 없이 즉시 착지 상태로 시작 (effect 내 동기 setState 회피)
  const [landed, setLanded] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const cube = cubeRef.current;
    const shadow = shadowRef.current;
    if (!cube) return;

    const [tx, ty] = FACE_TARGET[value]!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      cube.style.transform = `rotateX(${tx + IDLE_TILT[0]}deg) rotateY(${ty + IDLE_TILT[1]}deg)`;
      return;
    }

    // 시작 자세 → 다음 프레임에 목표 회전으로 transition (여러 바퀴 텀블)
    cube.style.transition = "none";
    cube.style.transform = `rotateX(${IDLE_TILT[0]}deg) rotateY(${IDLE_TILT[1]}deg)`;
    if (shadow) {
      shadow.style.transform = "scale(1.5)";
      shadow.style.opacity = "0.35";
    }

    const raf = requestAnimationFrame(() => {
      cube.style.transition = `transform ${TUMBLE_MS}ms cubic-bezier(0.18, 0.84, 0.32, 1.04)`;
      cube.style.transform = `rotateX(${tx - 720 + IDLE_TILT[0]}deg) rotateY(${ty + 1080 + IDLE_TILT[1]}deg)`;
    });

    const settleTimer = setTimeout(() => {
      cube.style.transition = `transform ${SETTLE_MS}ms ease-out`;
      cube.style.transform = `rotateX(${tx + IDLE_TILT[0]}deg) rotateY(${ty + IDLE_TILT[1]}deg)`;
      if (shadow) {
        shadow.style.transform = "scale(1)";
        shadow.style.opacity = "0.8";
      }
      setLanded(true);
    }, TUMBLE_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
    };
  }, [value]);

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={landed ? `주사위 ${value}` : "주사위 굴리는 중"}
    >
      <div className="dice3d-scene">
        <div ref={cubeRef} className="dice3d-cube">
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <Face key={v} value={v} />
          ))}
        </div>
      </div>
      <div ref={shadowRef} className="dice3d-shadow" aria-hidden="true" />
    </div>
  );
}
