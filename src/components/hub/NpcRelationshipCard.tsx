"use client";

import type { NpcEmotionalUI } from "@/types/game";

interface Props {
  npcs: NpcEmotionalUI[];
}

const POSTURE_LABELS: Record<string, { text: string; color: string }> = {
  FRIENDLY: { text: "우호적", color: "text-green-400" },
  CAUTIOUS: { text: "경계", color: "text-yellow-400" },
  HOSTILE: { text: "적대적", color: "text-red-400" },
  FEARFUL: { text: "두려움", color: "text-purple-400" },
  CALCULATING: { text: "계산적", color: "text-blue-400" },
};

function EmotionAxis({
  label,
  value,
  min,
  max,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
}) {
  const range = max - min;
  const normalized = ((value - min) / range) * 100;
  const isNegative = value < 0;

  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="w-10 text-zinc-500">{label}</span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden relative">
        {min < 0 && (
          <div className="absolute left-1/2 w-px h-full bg-zinc-600" />
        )}
        <div
          className={`absolute h-full rounded-full ${isNegative ? "bg-red-500" : "bg-blue-500"}`}
          style={
            min < 0
              ? {
                  left: isNegative ? `${normalized}%` : "50%",
                  width: `${Math.abs(normalized - 50)}%`,
                }
              : { width: `${normalized}%` }
          }
        />
      </div>
      <span
        className={`w-6 text-right ${isNegative ? "text-red-400" : "text-zinc-400"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function NpcRelationshipCard({ npcs }: Props) {
  if (npcs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-3">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        인물 관계
      </h3>

      {npcs.map((npc) => {
        const posture = POSTURE_LABELS[npc.posture] ?? {
          text: npc.posture,
          color: "text-zinc-400",
        };
        return (
          <div
            key={npc.npcId}
            className="border border-zinc-700 rounded-md p-2 bg-zinc-900/50"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-zinc-200">
                {npc.npcName}
              </span>
              <span className={`text-[10px] ${posture.color}`}>
                {posture.text}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <EmotionAxis
                label="신뢰"
                value={npc.trust}
                min={-100}
                max={100}
              />
              <EmotionAxis
                label="공포"
                value={npc.fear}
                min={0}
                max={100}
              />
              <EmotionAxis
                label="존경"
                value={npc.respect}
                min={-100}
                max={100}
              />
              <EmotionAxis
                label="의심"
                value={npc.suspicion}
                min={0}
                max={100}
              />
              <EmotionAxis
                label="유대"
                value={npc.attachment}
                min={0}
                max={100}
              />
            </div>

            {npc.marks.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {npc.marks.map((mark) => (
                  <span
                    key={mark}
                    className="text-[9px] px-1 py-0.5 bg-amber-900/40 text-amber-300 rounded"
                  >
                    {mark}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
