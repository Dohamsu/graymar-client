"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DIMTALE 손글씨 로고 — Vivus 로 path 를 따라 펜이 움직이며 그려지는 효과.
 * 애니메이션 완료 후 fill 을 채워 원본 실루엣 로고로 전환.
 */
interface Props {
  width: number;
  height: number;
  /** 전체 재생 시간(ms) */
  duration?: number;
  /** path 재생 방식: 'oneByOne' | 'delayed' | 'sync' | 'scenario' */
  mode?: "oneByOne" | "delayed" | "sync" | "scenario";
  className?: string;
  /** 재생 완료 시 fill 채울지 */
  fillAfter?: boolean;
  color?: string;
}

export function DimtaleLogoAnimated({
  width,
  height,
  duration = 2400,
  mode = "delayed",
  className,
  fillAfter = true,
  color = "#e9c176",
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let vivusInstance: unknown = null;

    const load = async () => {
      if (!hostRef.current) return;
      // Vivus 는 DOM 내 <svg> 를 찾아서 path 애니메이션을 수행.
      // <object> 대신 미리 로드된 inline SVG 를 대상으로 삼기 위해
      // fetch 로 SVG 텍스트를 받아와 컨테이너에 주입한다.
      try {
        const res = await fetch("/brand/dimtale-logo-stroke.svg");
        if (!res.ok || cancelled) return;
        const text = await res.text();
        if (!hostRef.current || cancelled) return;
        hostRef.current.innerHTML = text;

        // Vivus 동적 import (SSR 안전)
        const { default: Vivus } = await import("vivus");
        const svgEl = hostRef.current.querySelector("svg");
        if (!svgEl || cancelled) return;
        // 로고 크기를 props 에 맞게 재지정
        svgEl.setAttribute("width", String(width));
        svgEl.setAttribute("height", String(height));
        svgEl.removeAttribute("style");
        // currentColor 가 CSS color 를 따르도록
        (svgEl as SVGSVGElement).style.color = color;

        vivusInstance = new Vivus(svgEl as unknown as SVGElement, {
          duration: Math.max(10, Math.round(duration / 16)), // frames
          type: mode,
          start: "autostart",
          animTimingFunction: (Vivus as unknown as { EASE_OUT: unknown }).EASE_OUT,
        }, () => {
          if (cancelled) return;
          // 애니메이션 완료 → stroke 로고를 fill 실루엣으로 부드럽게 전환
          if (fillAfter) {
            const gEl = svgEl.querySelector("g");
            if (gEl) {
              gEl.setAttribute("fill", color);
              (gEl as SVGGElement).style.transition = "stroke-width 0.6s ease, fill 0.6s ease";
              gEl.setAttribute("stroke-width", "0");
            }
          }
          setFilled(true);
        });
      } catch (err) {
        console.warn("DimtaleLogoAnimated failed", err);
      }
    };

    load();
    return () => {
      cancelled = true;
      const anyInstance = vivusInstance as { stop?: () => void; destroy?: () => void } | null;
      anyInstance?.stop?.();
      anyInstance?.destroy?.();
    };
  }, [width, height, duration, mode, color]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label="DimTale"
      className={className}
      style={{
        width,
        height,
        color,
        // fillAfter true + filled 상태일 때 stroke 를 fill 로 전환
        ...(fillAfter && filled
          ? ({
              "--logo-fill": color,
            } as React.CSSProperties)
          : {}),
      }}
      data-filled={filled ? "true" : "false"}
    />
  );
}

export default DimtaleLogoAnimated;
