"use client";

import { useState, useEffect, useRef } from "react";
import { Sun, Moon, Sunrise, Sunset } from "lucide-react";

type TimePhase = "DAY" | "NIGHT";
type TimePhaseV2 = "DAWN" | "DAY" | "DUSK" | "NIGHT";

// 목적지 시간대(to) 기준 전환 연출 — 4상 모두 고유 문구/아이콘으로 표면화.
// (구 2상은 낮↔밤만, 그것도 황혼을 "밤"으로 오표기했음)
const TRANSITION_CONFIG: Record<TimePhaseV2, { icon: typeof Sun; text: string; color: string; bgColor: string }> = {
  DAWN: {
    icon: Sunrise,
    text: "동이 튼다",
    color: "var(--orange)",
    bgColor: "rgba(255, 170, 90, 0.08)",
  },
  DAY: {
    icon: Sun,
    text: "아침이 밝았다",
    color: "var(--gold)",
    bgColor: "rgba(255, 215, 0, 0.08)",
  },
  DUSK: {
    icon: Sunset,
    text: "해가 기운다",
    color: "var(--purple)",
    bgColor: "rgba(180, 130, 255, 0.08)",
  },
  NIGHT: {
    icon: Moon,
    text: "밤이 찾아온다",
    color: "var(--info-blue)",
    bgColor: "rgba(100, 150, 255, 0.08)",
  },
};

interface Props {
  timePhase: TimePhase;
  phaseV2?: TimePhaseV2;
}

export function TimePhaseTransition({ timePhase, phaseV2 }: Props) {
  // phaseV2가 있으면 4상, 없으면(구 런) 2상에서 파생
  const phase: TimePhaseV2 = phaseV2 ?? (timePhase === "DAY" ? "DAY" : "NIGHT");

  const [show, setShow] = useState(false);
  const [config, setConfig] = useState<(typeof TRANSITION_CONFIG)[TimePhaseV2] | null>(null);
  const prevPhase = useRef(phase);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 첫 렌더 시 전환 무시 (이어하기 시 오탐 방지)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPhase.current = phase;
      return;
    }

    if (phase === prevPhase.current) return;

    // 목적지 시간대 기준 연출
    const transConfig = TRANSITION_CONFIG[phase];
    prevPhase.current = phase;

    if (!transConfig) return;

    // 값(시간대) 변화에 반응해 2.5초 타이머 토스트를 띄우는 정당한 effect 패턴.
    // (Record가 전 키를 보장해 위 가드가 총족 불가로 분석되나, 방어적으로 유지)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(transConfig);
    setShow(true);

    // 2.5초 후 사라짐
    const timer = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(timer);
  }, [phase]);

  if (!show || !config) return null;

  const Icon = config.icon;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-3 rounded-xl border px-10 py-6 backdrop-blur-sm animate-[timePhaseReveal_2.5s_ease-in-out_forwards]"
        style={{
          backgroundColor: config.bgColor,
          borderColor: `${config.color}33`,
          boxShadow: `0 0 30px ${config.color}22`,
        }}
      >
        <Icon
          size={32}
          className="animate-[timePhaseIcon_1.5s_ease-out]"
          style={{ color: config.color }}
        />
        <span
          className="font-display text-lg font-semibold tracking-widest"
          style={{ color: config.color }}
        >
          {config.text}
        </span>
      </div>
    </div>
  );
}
