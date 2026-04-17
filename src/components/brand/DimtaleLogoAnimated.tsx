"use client";

/**
 * DIMTALE 손글씨 로고 — path 47개를 x 좌표 순서로 개별 stagger 드로잉.
 * SVG 내부의 CSS @keyframes 가 브라우저에서 바로 재생되므로 별도 라이브러리 불필요.
 * 애니메이션 종료(~4.96s) 후 fill 이 채워지며 실루엣 로고로 자연스럽게 전환.
 */
interface Props {
  width: number;
  height: number;
  className?: string;
}

export function DimtaleLogoAnimated({ width, height, className }: Props) {
  return (
    <img
      src="/brand/dimtale-logo-v2.svg"
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
