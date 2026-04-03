"use client";

import { memo } from "react";

/**
 * ASCII 주사위 도트 패턴 (3x3 그리드)
 * 각 배열은 [topRow, midRow, botRow] 형태
 * 0 = 빈칸, 1 = 도트(●)
 *
 * 1: [ ][*][ ]     2: [ ][ ][*]     3: [ ][ ][*]
 *    [ ][ ][ ]        [ ][ ][ ]        [ ][*][ ]
 *    [ ][ ][ ]        [*][ ][ ]        [*][ ][ ]
 *
 * 4: [*][ ][*]     5: [*][ ][*]     6: [*][ ][*]
 *    [ ][ ][ ]        [ ][*][ ]        [*][ ][*]
 *    [*][ ][*]        [*][ ][*]        [*][ ][*]
 */
const DICE_DOT_PATTERNS: Record<number, number[][]> = {
  1: [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ],
  2: [
    [0, 0, 1],
    [0, 0, 0],
    [1, 0, 0],
  ],
  3: [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ],
  4: [
    [1, 0, 1],
    [0, 0, 0],
    [1, 0, 1],
  ],
  5: [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ],
  6: [
    [1, 0, 1],
    [1, 0, 1],
    [1, 0, 1],
  ],
};

// ASCII box drawing 문자로 주사위 면을 구성
function buildAsciiLines(value: number): string[] {
  const pattern = DICE_DOT_PATTERNS[value] ?? DICE_DOT_PATTERNS[1];
  const top = "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"; // ┌─────────┐
  const bot = "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"; // └─────────┘

  const rows = pattern.map((row) => {
    const cells = row.map((dot) => (dot ? "\u25CF" : " "));
    // 3 cells => "  ●   ●  " or "    ●    " etc, padded to 9 chars inside │...│
    return `\u2502  ${cells[0]}   ${cells[1]}   ${cells[2]}  \u2502`;
  });

  return [top, ...rows, bot];
}

interface DiceFaceProps {
  value: number; // 1~6
  dotColor?: string;
  frameColor?: string;
  isRolling?: boolean;
}

export const DiceFace = memo(function DiceFace({
  value,
  dotColor = "var(--text-muted)",
  frameColor = "var(--border-primary)",
  isRolling = false,
}: DiceFaceProps) {
  const lines = buildAsciiLines(value);

  return (
    <pre
      className="select-none leading-[1.3] text-center"
      style={{
        fontFamily: "'Geist Mono', 'IBM Plex Mono', 'Courier New', monospace",
        fontSize: "clamp(11px, 2.5vw, 14px)",
        color: frameColor,
        filter: isRolling ? "blur(0.5px)" : "none",
        transition: "filter 0.1s ease",
      }}
      aria-label={`\uC8FC\uC0AC\uC704 ${value}`}
      role="img"
    >
      {lines.map((line, i) => {
        // Rows 1-3 (index 1,2,3) contain dots - colorize the dot characters
        if (i >= 1 && i <= 3) {
          return (
            <span key={i} className="block">
              {line.split("").map((ch, j) =>
                ch === "\u25CF" ? (
                  <span key={j} style={{ color: dotColor }}>
                    {ch}
                  </span>
                ) : (
                  <span key={j}>{ch}</span>
                ),
              )}
            </span>
          );
        }
        return (
          <span key={i} className="block">
            {line}
          </span>
        );
      })}
    </pre>
  );
});

export { DICE_DOT_PATTERNS };
