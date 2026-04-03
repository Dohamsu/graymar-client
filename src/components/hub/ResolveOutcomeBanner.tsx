"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ResolveOutcome, ResolveBreakdown } from "@/types/game";
import { STAT_KOREAN_NAMES, STAT_COLORS, STAT_KEY_TO_LABEL } from "@/data/stat-descriptions";
import { DiceFace } from "./DiceFace";

// ---------------------------------------------------------------------------
// Outcome config
// ---------------------------------------------------------------------------

const OUTCOME_CONFIG: Record<
  ResolveOutcome,
  { label: string; labelSpaced: string; color: string; bgColor: string; glowColor: string }
> = {
  SUCCESS: {
    label: "성공",
    labelSpaced: "성 공",
    color: "var(--success-green)",
    bgColor: "rgba(76, 175, 80, 0.08)",
    glowColor: "rgba(76, 175, 80, 0.3)",
  },
  PARTIAL: {
    label: "부분 성공",
    labelSpaced: "부분 성공",
    color: "var(--gold)",
    bgColor: "rgba(255, 215, 0, 0.08)",
    glowColor: "rgba(255, 215, 0, 0.3)",
  },
  FAIL: {
    label: "실패",
    labelSpaced: "실 패",
    color: "var(--hp-red)",
    bgColor: "rgba(244, 67, 54, 0.08)",
    glowColor: "rgba(244, 67, 54, 0.3)",
  },
};

// ---------------------------------------------------------------------------
// Outcome color for dice dots
// ---------------------------------------------------------------------------

function getOutcomeColor(outcome: ResolveOutcome): string {
  return OUTCOME_CONFIG[outcome].color;
}

// ---------------------------------------------------------------------------
// Animation phase type
// ---------------------------------------------------------------------------

type AnimPhase = "APPEAR" | "ROLL" | "BREAKDOWN" | "OUTCOME" | "DONE";

// Roll timing: starts fast, decelerates
const ROLL_STEPS = 12; // total face changes during roll
const ROLL_BASE_MS = 70;
const ROLL_DECEL = 15; // each step adds this many ms

// ---------------------------------------------------------------------------
// ASCII Dice Roll Animation (core component)
// ---------------------------------------------------------------------------

function AsciiDiceRollAnimation({
  breakdown,
  outcome,
  skipAnimation,
}: {
  breakdown: ResolveBreakdown;
  outcome: ResolveOutcome;
  skipAnimation: boolean;
}) {
  const { diceRoll, statKey, statBonus, baseMod, totalScore, traitBonus, gamblerLuckTriggered } = breakdown;

  const [phase, setPhase] = useState<AnimPhase>(skipAnimation ? "DONE" : "APPEAR");
  const [displayValue, setDisplayValue] = useState(skipAnimation ? diceRoll : 1);
  const [breakdownStep, setBreakdownStep] = useState(skipAnimation ? 99 : 0);
  const [showGamblerFlash, setShowGamblerFlash] = useState(false);
  const [gamblerShaking, setGamblerShaking] = useState(false);

  const rollStepRef = useRef(0);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

  // Phase transitions
  useEffect(() => {
    if (skipAnimation) return;

    if (phase === "APPEAR") {
      const timer = setTimeout(() => setPhase("ROLL"), 300);
      return () => clearTimeout(timer);
    }

    if (phase === "BREAKDOWN") {
      // Reveal breakdown items one by one (100ms intervals)
      const totalItems = countBreakdownItems(breakdown);
      const timer = setInterval(() => {
        setBreakdownStep((prev) => {
          const next = prev + 1;
          if (next >= totalItems) {
            clearInterval(timer);
            setTimeout(() => setPhase("OUTCOME"), 200);
          }
          return next;
        });
      }, 120);
      return () => clearInterval(timer);
    }

    if (phase === "OUTCOME") {
      // Gambler luck special effect
      if (gamblerLuckTriggered) {
        setGamblerShaking(true);
        const t1 = setTimeout(() => {
          setGamblerShaking(false);
          setShowGamblerFlash(true);
        }, 400);
        const t2 = setTimeout(() => setPhase("DONE"), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      const timer = setTimeout(() => setPhase("DONE"), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, skipAnimation, gamblerLuckTriggered, breakdown]);

  // Rolling animation with deceleration
  const doRollStep = useCallback(() => {
    rollStepRef.current += 1;
    const step = rollStepRef.current;

    if (step >= ROLL_STEPS) {
      // Final value
      setDisplayValue(diceRoll);
      setTimeout(() => setPhase("BREAKDOWN"), 200);
      return;
    }

    // Random face (avoid repeating same face)
    setDisplayValue((prev) => {
      let next = prev;
      while (next === prev) {
        next = Math.floor(Math.random() * 6) + 1;
      }
      return next;
    });

    const delay = ROLL_BASE_MS + step * ROLL_DECEL;
    rollTimerRef.current = setTimeout(doRollStep, delay);
  }, [diceRoll]);

  useEffect(() => {
    if (phase === "ROLL") {
      rollStepRef.current = 0;
      const delay = ROLL_BASE_MS;
      rollTimerRef.current = setTimeout(doRollStep, delay);
      return () => {
        if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
      };
    }
  }, [phase, doRollStep]);

  // Resolve dot color
  const isRolling = phase === "ROLL";
  const isFinal = phase === "BREAKDOWN" || phase === "OUTCOME" || phase === "DONE";
  const dotColor = isFinal ? getOutcomeColor(outcome) : "var(--text-muted)";
  const frameColor = isFinal ? "var(--text-secondary)" : "var(--border-primary)";

  // Stat info
  const statLabel = statKey ? (STAT_KOREAN_NAMES[statKey] ?? STAT_KEY_TO_LABEL[statKey] ?? statKey) : null;
  const statColorKey = statKey ? (STAT_KEY_TO_LABEL[statKey] ?? statKey.toUpperCase()) : null;
  const statColor = statColorKey ? (STAT_COLORS[statColorKey] ?? "var(--text-secondary)") : null;

  const config = OUTCOME_CONFIG[outcome];

  return (
    <div
      className={`flex flex-col items-center gap-2 py-3 ${gamblerShaking ? "animate-[gamblerShake_0.2s_ease-in-out_2]" : ""}`}
    >
      {/* Dice face */}
      <div
        className={
          phase === "APPEAR"
            ? "animate-[diceTextAppear_0.3s_ease-out_both]"
            : isFinal
              ? "animate-[diceSettle_0.2s_ease-in-out]"
              : ""
        }
      >
        <DiceFace
          value={displayValue}
          dotColor={dotColor}
          frameColor={frameColor}
          isRolling={isRolling}
        />
      </div>

      {/* Rolling text */}
      {phase === "ROLL" && (
        <span className="text-xs text-[var(--text-muted)] animate-pulse">
          판정 중...
        </span>
      )}

      {/* Breakdown formula - sequential reveal */}
      {(phase === "BREAKDOWN" || phase === "OUTCOME" || phase === "DONE") && (
        <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-[var(--text-muted)]">
          <BreakdownItem visible={breakdownStep >= 1} delay={0}>
            <span className="text-[var(--text-primary)] font-semibold">
              {"\uD83C\uDFB2"} {diceRoll}
            </span>
          </BreakdownItem>

          {statLabel && (
            <BreakdownItem visible={breakdownStep >= 2} delay={1}>
              <span>+</span>
              <span style={{ color: statColor ?? undefined }}>{statLabel}</span>
              <span className="text-[var(--text-secondary)] font-semibold">{statBonus}</span>
            </BreakdownItem>
          )}

          {baseMod != null && baseMod !== 0 && (
            <BreakdownItem visible={breakdownStep >= 3} delay={2}>
              <span>{baseMod > 0 ? "+" : ""}</span>
              <span
                className="font-semibold"
                style={{ color: baseMod > 0 ? "var(--success-green)" : "var(--hp-red)" }}
              >
                보정 {baseMod > 0 ? `+${baseMod}` : baseMod}
              </span>
            </BreakdownItem>
          )}

          {traitBonus != null && traitBonus !== 0 && (
            <BreakdownItem visible={breakdownStep >= 4} delay={3}>
              <span className="text-[var(--gold)]">
                특성 {traitBonus > 0 ? `+${traitBonus}` : traitBonus}
              </span>
            </BreakdownItem>
          )}

          <BreakdownItem visible={breakdownStep >= (countBreakdownItems(breakdown) )} delay={4}>
            <span>=</span>
            <span className="font-bold text-[var(--text-primary)]">{totalScore}</span>
          </BreakdownItem>
        </div>
      )}

      {/* Outcome label */}
      {(phase === "OUTCOME" || phase === "DONE") && (
        <div
          className={phase === "OUTCOME" ? "animate-[outcomeReveal_0.4s_ease-out_both]" : ""}
          style={{
            textShadow: phase === "OUTCOME" ? `0 0 12px ${config.glowColor}` : undefined,
          }}
        >
          <span
            className="font-display text-sm font-bold tracking-[0.2em]"
            style={{ color: config.color }}
          >
            {"━━ "}{config.labelSpaced}{" ━━"}
          </span>
        </div>
      )}

      {/* Gambler luck flash */}
      {showGamblerFlash && (
        <span
          className="text-xs font-bold animate-[diceTextAppear_0.3s_ease-out_both]"
          style={{ color: "var(--gold)", textShadow: "0 0 8px rgba(255, 215, 0, 0.5)" }}
        >
          도박꾼의 운!
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown item wrapper with fade-in
// ---------------------------------------------------------------------------

function BreakdownItem({
  visible,
  delay: _delay,
  children,
}: {
  visible: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <span className="inline-flex items-center gap-1 animate-[breakdownReveal_0.25s_ease-out_both]">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Count total breakdown items for sequential reveal
// ---------------------------------------------------------------------------

function countBreakdownItems(b: ResolveBreakdown): number {
  let count = 1; // dice roll
  if (b.statKey) count++; // stat bonus
  if (b.baseMod != null && b.baseMod !== 0) count++; // base mod
  if (b.traitBonus != null && b.traitBonus !== 0) count++; // trait bonus
  count++; // = totalScore
  return count;
}

// ---------------------------------------------------------------------------
// ResolveOutcomeInline (exported, main entry point)
// ---------------------------------------------------------------------------

/** 인라인 판정 애니메이션 -- ASCII 주사위 롤링 -> 분해 공식 -> 결과 */
export function ResolveOutcomeInline({
  outcome,
  breakdown,
  skipAnimation: skipAnimationProp,
}: {
  outcome: ResolveOutcome;
  breakdown?: ResolveBreakdown;
  skipAnimation?: boolean;
}) {
  const config = OUTCOME_CONFIG[outcome];

  // No breakdown = non-challenge action, show simple result
  if (!breakdown) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-3">
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
      </div>
    );
  }

  // With breakdown = challenge action -> ASCII dice animation
  return (
    <AsciiDiceRollAnimation
      breakdown={breakdown}
      outcome={outcome}
      skipAnimation={skipAnimationProp ?? false}
    />
  );
}

// ---------------------------------------------------------------------------
// ResolveOutcomeBanner (legacy export, currently unused)
// ---------------------------------------------------------------------------

/** 상단 고정 배너 (레거시 -- 현재 미사용) */
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
