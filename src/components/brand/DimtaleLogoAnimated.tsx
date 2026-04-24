"use client";

import { useEffect, useRef } from "react";

/**
 * DIMTALE 손글씨 로고 — SVG 내부 CSS @keyframes 로 path 순차 드로잉 + fill 전환.
 * 약 2.9초 후 onReady 콜백으로 상위에 완료 신호를 보낸다.
 */
interface Props {
  width: number;
  height: number;
  className?: string;
  /** 애니메이션 완료 시 콜백 (기본 2900ms 후) */
  onReady?: () => void;
  /** 완료 감지 시간 (ms). SVG 타이밍과 맞춰 조정. */
  readyAfterMs?: number;
  /** 드로잉 애니메이션을 생략하고 완성 상태 정적 SVG를 즉시 표시 (onReady 즉시 호출) */
  skipAnimation?: boolean;
}

export function DimtaleLogoAnimated({
  width,
  height,
  className,
  onReady,
  readyAfterMs = 2900,
  skipAnimation = false,
}: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!onReady) return;
    firedRef.current = false;
    const delay = skipAnimation ? 0 : readyAfterMs;
    const t = window.setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onReady();
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [onReady, readyAfterMs, skipAnimation]);

  return (
    <img
      src={skipAnimation ? "/brand/dimtale-logo-gold.svg" : "/brand/dimtale-logo-v2.svg"}
      width={width}
      height={height}
      alt="DimTale"
      role="img"
      className={className}
      style={{ display: "block" }}
    />
  );
}

export default DimtaleLogoAnimated;
