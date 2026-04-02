"use client";

import type { NpcEmotionalUI } from "@/types/game";

interface Props {
  npcs: NpcEmotionalUI[];
}

const POSTURE_LABELS: Record<string, { text: string; color: string }> = {
  FRIENDLY: { text: "우호적", color: "text-[var(--success-green)]" },
  CAUTIOUS: { text: "경계", color: "text-[var(--gold)]" },
  HOSTILE: { text: "적대적", color: "text-[var(--hp-red)]" },
  FEARFUL: { text: "두려움", color: "text-[var(--purple)]" },
  CALCULATING: { text: "계산적", color: "text-[var(--info-blue)]" },
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
      <span className="w-10 text-[var(--text-muted)]">{label}</span>
      <div className="flex-1 h-1 bg-[var(--border-primary)] rounded-full overflow-hidden relative">
        {min < 0 && (
          <div className="absolute left-1/2 w-px h-full bg-[var(--text-muted)]" />
        )}
        <div
          className={`absolute h-full rounded-full ${isNegative ? "bg-[var(--hp-red)]" : "bg-[var(--info-blue)]"}`}
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
        className={`w-6 text-right ${isNegative ? "text-[var(--hp-red)]" : "text-[var(--text-secondary)]"}`}
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
      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        인물 관계
      </h3>

      {npcs.map((npc) => {
        const posture = POSTURE_LABELS[npc.posture] ?? {
          text: npc.posture,
          color: "text-[var(--text-secondary)]",
        };
        return (
          <div
            key={npc.npcId}
            className="border border-[var(--border-primary)] rounded-md p-2 bg-[var(--bg-card)]"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {npc.npcName}
              </span>
              <span className={`text-[10px] ${posture.color}`}>
                {posture.text}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <EmotionAxis
                label="신뢰"
                value={npc.trust ?? 0}
                min={-100}
                max={100}
              />
              <EmotionAxis
                label="공포"
                value={npc.fear ?? 0}
                min={0}
                max={100}
              />
              <EmotionAxis
                label="존경"
                value={npc.respect ?? 0}
                min={-100}
                max={100}
              />
              <EmotionAxis
                label="의심"
                value={npc.suspicion ?? 0}
                min={0}
                max={100}
              />
              <EmotionAxis
                label="유대"
                value={npc.attachment ?? 0}
                min={0}
                max={100}
              />
            </div>

            {npc.marks.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {npc.marks.map((mark) => (
                  <span
                    key={mark}
                    className="text-[9px] px-1 py-0.5 bg-[var(--gold)]/20 text-[var(--gold)] rounded"
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
