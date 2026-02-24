"use client";

import type { IncidentSummaryUI } from "@/types/game";

interface Props {
  incidents: IncidentSummaryUI[];
}

const KIND_LABELS: Record<string, string> = {
  POLITICAL: "정치",
  CRIMINAL: "범죄",
  ECONOMIC: "경제",
  SOCIAL: "사회",
  MILITARY: "군사",
};

const OUTCOME_LABELS: Record<string, { text: string; color: string }> = {
  CONTAINED: { text: "해결됨", color: "text-green-400" },
  ESCALATED: { text: "악화됨", color: "text-red-400" },
  EXPIRED: { text: "시효만료", color: "text-zinc-400" },
};

function GaugeBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="w-8 text-zinc-500">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-7 text-right text-zinc-400">{value}%</span>
    </div>
  );
}

export function IncidentTracker({ incidents }: Props) {
  const active = incidents.filter((i) => !i.resolved);
  const resolved = incidents.filter((i) => i.resolved);

  if (incidents.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-3">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        진행 중인 사건
      </h3>

      {active.map((inc) => (
        <div
          key={inc.incidentId}
          className="border border-zinc-700 rounded-md p-2 bg-zinc-900/50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-200">
              {inc.title}
            </span>
            <span className="text-[10px] text-zinc-500">
              {KIND_LABELS[inc.kind] ?? inc.kind}
            </span>
          </div>
          <GaugeBar
            value={inc.control}
            max={100}
            color="bg-blue-500"
            label="통제"
          />
          <GaugeBar
            value={inc.pressure}
            max={100}
            color="bg-red-500"
            label="압력"
          />
        </div>
      ))}

      {resolved.length > 0 && (
        <div className="text-[10px] text-zinc-500 mt-1">
          {resolved.map((inc) => {
            const o = OUTCOME_LABELS[inc.outcome ?? ""] ?? {
              text: "???",
              color: "text-zinc-400",
            };
            return (
              <div key={inc.incidentId} className="flex justify-between">
                <span>{inc.title}</span>
                <span className={o.color}>{o.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
