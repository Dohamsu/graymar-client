"use client";

import type { PackMeterUI } from "@/types/game";

/**
 * [P2 — architecture/73 B1] 팩 세계축 게이지 표시.
 * Heat 옆에 팩 선언 미터(예: 꿈 오염)를 렌더. 경고 임계(warnAt) 이상이면
 * 골드→위험색으로 전환해 "세계가 차오르는" 긴장을 시각화한다.
 * 미선언 팩은 packMeters 부재 → 아무것도 렌더 안 함.
 */
export function PackMeterGauge({ meters }: { meters?: PackMeterUI[] }) {
  if (!meters || meters.length === 0) return null;

  return (
    <>
      {meters.map((m) => {
        const pct = Math.min(100, Math.max(0, (m.value / (m.max || 100)) * 100));
        const warn = m.warnAt != null && m.value >= m.warnAt;
        const critical = m.value >= 90;
        const barColor = critical
          ? "bg-[var(--hp-red)]"
          : warn
            ? "bg-[var(--gold)]"
            : "bg-[var(--text-muted)]";
        const textColor = critical
          ? "text-[var(--hp-red)]"
          : warn
            ? "text-[var(--gold)]"
            : "text-[var(--text-secondary)]";

        return (
          <div key={m.id} className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold ${textColor}`}>
              {m.name}
            </span>
            <div className="h-[6px] w-[50px] overflow-hidden rounded-full bg-[var(--border-primary)] lg:w-[70px]">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              {Math.round(m.value)}
            </span>
          </div>
        );
      })}
    </>
  );
}
