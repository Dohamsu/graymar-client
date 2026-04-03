"use client";

import { useState, useEffect } from "react";
import type { ResolveOutcome, ResolveBreakdown } from "@/types/game";
import { STAT_KOREAN_NAMES, STAT_COLORS, STAT_KEY_TO_LABEL } from "@/data/stat-descriptions";

const OUTCOME_CONFIG: Record<
  ResolveOutcome,
  { label: string; color: string; bgColor: string; glowColor: string }
> = {
  SUCCESS: {
    label: "성공",
    color: "var(--success-green)",
    bgColor: "rgba(76, 175, 80, 0.08)",
    glowColor: "rgba(76, 175, 80, 0.3)",
  },
  PARTIAL: {
    label: "부분 성공",
    color: "var(--gold)",
    bgColor: "rgba(255, 215, 0, 0.08)",
    glowColor: "rgba(255, 215, 0, 0.3)",
  },
  FAIL: {
    label: "실패",
    color: "var(--hp-red)",
    bgColor: "rgba(244, 67, 54, 0.08)",
    glowColor: "rgba(244, 67, 54, 0.3)",
  },
};

const ROLL_DURATION_MS = 1200;
const BREAKDOWN_DELAY_MS = 200;

/** 인라인 판정 애니메이션 — 주사위 굴림 → 결과 공개 → 주사위 분해 */
export function ResolveOutcomeInline({
  outcome,
  breakdown,
}: {
  outcome: ResolveOutcome;
  breakdown?: ResolveBreakdown;
}) {
  const [phase, setPhase] = useState<"rolling" | "revealed">("rolling");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const config = OUTCOME_CONFIG[outcome];

  useEffect(() => {
    const timer = setTimeout(() => setPhase("revealed"), ROLL_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === "revealed" && breakdown) {
      const timer = setTimeout(() => setShowBreakdown(true), BREAKDOWN_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [phase, breakdown]);

  return (
    <div className="flex flex-col items-center justify-center gap-1 py-3">
      {phase === "rolling" ? (
        <DiceRolling />
      ) : (
        <>
          <div
            className="flex items-center gap-2 rounded-lg border px-5 py-2.5 animate-[outcomeReveal_0.5s_ease-out]"
            style={{
              backgroundColor: config.bgColor,
              borderColor: config.glowColor,
              boxShadow: `0 0 12px ${config.glowColor}`,
            }}
          >
            <span className="text-lg" role="img" aria-label="dice">
              &#x2680;
            </span>
            <span
              className="font-display text-base font-bold tracking-wide"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
          </div>
          {showBreakdown && breakdown && (
            <BreakdownFormula breakdown={breakdown} />
          )}
        </>
      )}
    </div>
  );
}

/** 주사위 분해 공식 표시 */
function BreakdownFormula({ breakdown }: { breakdown: ResolveBreakdown }) {
  const { diceRoll, statKey, statBonus, baseMod, totalScore, traitBonus, gamblerLuckTriggered } = breakdown;
  const statLabel = statKey ? (STAT_KOREAN_NAMES[statKey] ?? STAT_KEY_TO_LABEL[statKey] ?? statKey) : null;
  const statColorKey = statKey ? (STAT_KEY_TO_LABEL[statKey] ?? statKey.toUpperCase()) : null;
  const statColor = statColorKey ? (STAT_COLORS[statColorKey] ?? "var(--text-secondary)") : null;

  return (
    <div
      className="flex items-center gap-1 text-xs text-[var(--text-muted)] animate-[fadeIn_0.3s_ease-out]"
    >
      <span>🎲</span>
      <span className="text-[var(--text-secondary)]">{diceRoll}</span>
      {statLabel && (
        <>
          <span>+</span>
          <span style={{ color: statColor ?? undefined }}>{statLabel}</span>
          <span className="text-[var(--text-secondary)]">{statBonus}</span>
        </>
      )}
      {baseMod != null && baseMod !== 0 && (
        <>
          <span>{baseMod > 0 ? "+" : ""}</span>
          <span
            className="font-semibold"
            style={{ color: baseMod > 0 ? "var(--success-green)" : "var(--hp-red)" }}
          >
            보정 {baseMod > 0 ? `+${baseMod}` : baseMod}
          </span>
        </>
      )}
      {traitBonus != null && traitBonus !== 0 && (
        <span className="text-xs text-[var(--gold)]">
          특성 {traitBonus > 0 ? `+${traitBonus}` : traitBonus}
        </span>
      )}
      {gamblerLuckTriggered && (
        <span className="text-xs text-[var(--gold)]">도박꾼의 운!</span>
      )}
      <span>=</span>
      <span className="font-bold text-[var(--text-primary)]">{totalScore}</span>
    </div>
  );
}

/** 주사위 굴림 애니메이션 */
function DiceRolling() {
  const [faceIndex, setFaceIndex] = useState(0);
  const faces = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];

  useEffect(() => {
    const timer = setInterval(() => {
      setFaceIndex((prev) => (prev + 1) % faces.length);
    }, 100);
    return () => clearInterval(timer);
  }, [faces.length]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-5 py-2.5">
      <span className="text-xl animate-[diceSpin_0.6s_linear_infinite]">
        {faces[faceIndex]}
      </span>
      <span className="text-sm text-[var(--text-muted)] animate-pulse">
        판정 중...
      </span>
    </div>
  );
}

/** 상단 고정 배너 (레거시 — 현재 미사용) */
export function ResolveOutcomeBanner({
  outcome,
}: {
  outcome: ResolveOutcome;
}) {
  const config = OUTCOME_CONFIG[outcome];

  return (
    <div
      className="mx-4 mb-2 flex items-center justify-center rounded-md border px-4 py-2"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.glowColor,
      }}
    >
      <span
        className="text-sm font-semibold"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
}
