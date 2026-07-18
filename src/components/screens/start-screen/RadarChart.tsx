"use client";
// [arch/77 P5a] 스탯 레이더 차트 (SVG) — StartScreen.tsx에서 분리.

export function RadarChart({
  baseStats,
  bonusStats,
  size = 200,
}: {
  baseStats: Record<string, number>;
  bonusStats: Record<string, number>;
  size?: number;
}) {
  // 하단 스탯 카드와 표기 통일 — 한글 라벨 (arch/68 C-5)
  const labels = ["힘", "민첩", "재치", "체질", "통찰", "카리스마"];
  const keys = ["str", "dex", "wit", "con", "per", "cha"];
  const maxVal = 22; // max possible with bonus
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const ratio = Math.min(value / maxVal, 1);
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  };

  const basePoints = keys.map((k, i) => getPoint(i, baseStats[k] ?? 0));
  const totalPoints = keys.map((k, i) => getPoint(i, (baseStats[k] ?? 0) + (bonusStats[k] ?? 0)));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  // Grid lines
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => {
        const pts = Array.from({ length: 6 }, (_, i) => getPoint(i, maxVal * level));
        return (
          <polygon
            key={level}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const p = getPoint(i, maxVal);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border-primary)" strokeWidth={0.5} />;
      })}
      {/* Base fill */}
      <polygon points={basePoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(136,136,136,0.15)" stroke="rgba(136,136,136,0.4)" strokeWidth={1} />
      {/* Total fill (with bonus) */}
      <path d={toPath(totalPoints)} fill="rgba(201,169,98,0.2)" stroke="var(--gold)" strokeWidth={1.5} />
      {/* Dots */}
      {totalPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--gold)" />
      ))}
      {/* Labels */}
      {labels.map((label, i) => {
        const p = getPoint(i, maxVal * 1.22);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--text-secondary)"
            fontSize={11}
            fontWeight={600}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

