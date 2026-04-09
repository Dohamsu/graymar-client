"use client";

import { useState, useEffect, useRef } from "react";
import { Sun, Moon } from "lucide-react";

type TimePhase = "DAY" | "NIGHT";

const TRANSITION_CONFIG: Record<string, { icon: typeof Sun; text: string; color: string; bgColor: string }> = {
  "DAY→NIGHT": {
    icon: Moon,
    text: "밤이 찾아온다",
    color: "var(--info-blue)",
    bgColor: "rgba(100, 150, 255, 0.08)",
  },
  "NIGHT→DAY": {
    icon: Sun,
    text: "동이 튼다",
    color: "var(--gold)",
    bgColor: "rgba(255, 215, 0, 0.08)",
  },
};

interface Props {
  timePhase: TimePhase;
}

export function TimePhaseTransition({ timePhase }: Props) {
  const [show, setShow] = useState(false);
  const [config, setConfig] = useState<(typeof TRANSITION_CONFIG)[string] | null>(null);
  const prevPhase = useRef(timePhase);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // 첫 렌더 시 전환 무시 (이어하기 시 오탐 방지)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPhase.current = timePhase;
      return;
    }

    if (timePhase === prevPhase.current) return;

    const key = `${prevPhase.current}→${timePhase}`;
    const transConfig = TRANSITION_CONFIG[key];
    prevPhase.current = timePhase;

    if (!transConfig) return;

    setConfig(transConfig);
    setShow(true);

    // 2.5초 후 사라짐
    const timer = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(timer);
  }, [timePhase]);

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
