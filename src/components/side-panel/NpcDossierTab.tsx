"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { User, Eye } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import type { NpcEmotionalUI } from "@/types/game";
import { getNpcPortraitUrl } from "@/data/npc-portraits";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSTURE_LABELS: Record<string, { label: string; color: string }> = {
  FRIENDLY: { label: "우호", color: "#22c55e" },
  CAUTIOUS: { label: "경계", color: "#eab308" },
  HOSTILE: { label: "적대", color: "#ef4444" },
  FEARFUL: { label: "두려움", color: "#a855f7" },
  CALCULATING: { label: "계산적", color: "#3b82f6" },
};

const EMOTION_CONFIG: { key: keyof Pick<NpcEmotionalUI, 'trust' | 'fear' | 'respect' | 'suspicion' | 'attachment'>; label: string; color: string }[] = [
  { key: "trust", label: "신뢰", color: "#22c55e" },
  { key: "fear", label: "공포", color: "#ef4444" },
  { key: "respect", label: "존경", color: "#eab308" },
  { key: "suspicion", label: "의심", color: "#a855f7" },
  { key: "attachment", label: "유대", color: "#3b82f6" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Emotion bar with label */
function EmotionBar({ label, value, color }: { label: string; value: number; color: string }) {
  // Emotion values range from -100 to 100, normalize to 0-100 for display
  const normalized = Math.max(0, Math.min(100, (value + 100) / 2));
  const isNegative = value < 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[9px] font-medium" style={{ color: "#2a1f14" }}>
        {label}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#2a1f14]/15">
        {/* Center marker */}
        <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-[#2a1f14]/20" />
        {value !== 0 && (
          <div
            className="absolute top-0 h-full rounded-full transition-all duration-500"
            style={{
              left: isNegative ? `${normalized}%` : "50%",
              width: `${Math.abs(normalized - 50)}%`,
              backgroundColor: color,
              opacity: 0.85,
            }}
          />
        )}
      </div>
      <span
        className="w-6 text-right text-[9px] font-semibold"
        style={{ color: value > 0 ? color : value < 0 ? "#ef4444" : "#2a1f14" }}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

/** NPC thumbnail in bottom carousel */
function NpcThumbnail({
  npc,
  isSelected,
  onSelect,
}: {
  npc: NpcEmotionalUI;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const portraitUrl = getNpcPortraitUrl(npc.npcId);
  const postureInfo = POSTURE_LABELS[npc.posture];
  const borderColor = postureInfo?.color ?? "#9CA3AF";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex shrink-0 flex-col items-center gap-1 transition-all ${
        isSelected ? "scale-105" : "opacity-70 hover:opacity-100"
      }`}
    >
      <div
        className="relative h-14 w-14 overflow-hidden rounded-lg border-2 transition-all"
        style={{
          borderColor: isSelected ? borderColor : "transparent",
          boxShadow: isSelected ? `0 0 8px ${borderColor}40` : "none",
        }}
      >
        {portraitUrl ? (
          <Image
            src={portraitUrl}
            alt={npc.npcName}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#2a1f14]/30">
            <User size={24} className="text-[#8b7355]" />
          </div>
        )}
      </div>
      <span
        className="max-w-16 truncate text-[9px] font-medium"
        style={{ color: "var(--gold)" }}
      >
        {npc.npcName}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NpcDossierTab() {
  const npcEmotional = useGameStore((s) => s.npcEmotional);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);

  // Only show NPCs that have been encountered (present in npcEmotional)
  const metNpcs = npcEmotional;

  // Auto-select first NPC if none selected
  const selectedNpc = metNpcs.find((n) => n.npcId === selectedNpcId) ?? metNpcs[0] ?? null;

  const handleSelect = useCallback((npcId: string) => {
    setSelectedNpcId(npcId);
  }, []);

  if (metNpcs.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center rounded-lg bg-cover bg-center p-6"
        style={{ backgroundImage: "url('/textures/tavern-wall.webp')" }}
      >
        <div className="flex flex-col items-center gap-3 rounded-lg bg-black/40 px-6 py-8 backdrop-blur-sm">
          <Eye size={32} className="text-[var(--gold)]/60" />
          <p className="text-center text-sm text-[var(--gold)]/80">
            아직 만난 인물이 없다
          </p>
          <p className="text-center text-[10px] text-[var(--text-muted)]">
            그레이마르의 인물들과 교류하면 이곳에 기록됩니다
          </p>
        </div>
      </div>
    );
  }

  const portraitUrl = selectedNpc ? getNpcPortraitUrl(selectedNpc.npcId) : null;
  const postureInfo = selectedNpc ? POSTURE_LABELS[selectedNpc.posture] : null;

  return (
    <div
      className="flex h-full flex-col gap-4 rounded-lg bg-cover bg-center p-3"
      style={{ backgroundImage: "url('/textures/tavern-wall.webp')" }}
    >
      {/* Selected NPC — Wanted Poster Card */}
      {selectedNpc && (
        <div
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-lg bg-cover bg-center px-5 py-5 shadow-lg"
          style={{ backgroundImage: "url('/textures/wanted-poster.webp')" }}
        >
          {/* Portrait */}
          <div className="relative h-[140px] w-[110px] overflow-hidden rounded border-2 border-[#2a1f14]/30 bg-[#2a1f14]/10 shadow-md">
            {portraitUrl ? (
              <Image
                src={portraitUrl}
                alt={selectedNpc.npcName}
                fill
                sizes="110px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User size={48} className="text-[#8b7355]" />
              </div>
            )}
          </div>

          {/* Name */}
          <h3
            className="text-center font-display text-lg font-bold tracking-wide"
            style={{ color: "#2a1f14" }}
          >
            {selectedNpc.npcName}
          </h3>

          {/* Posture Badge */}
          {postureInfo && (
            <span
              className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider"
              style={{
                backgroundColor: `${postureInfo.color}20`,
                color: postureInfo.color,
                border: `1px solid ${postureInfo.color}40`,
              }}
            >
              {postureInfo.label}
            </span>
          )}

          {/* Narrative Marks */}
          {selectedNpc.marks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {selectedNpc.marks.map((mark, i) => (
                <span
                  key={`${mark}-${i}`}
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    backgroundColor: "#2a1f14",
                    color: "#d4a574",
                  }}
                >
                  {mark}
                </span>
              ))}
            </div>
          )}

          {/* Emotion Bars */}
          <div className="mt-1 flex w-full flex-col gap-1.5">
            {EMOTION_CONFIG.map(({ key, label, color }) => (
              <EmotionBar
                key={key}
                label={label}
                value={selectedNpc[key]}
                color={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* NPC Thumbnail Carousel */}
      <div className="flex flex-col gap-2">
        <span
          className="text-[10px] font-semibold tracking-[1px]"
          style={{ color: "var(--gold)" }}
        >
          만난 인물 ({metNpcs.length})
        </span>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {metNpcs.map((npc) => (
            <NpcThumbnail
              key={npc.npcId}
              npc={npc}
              isSelected={selectedNpc?.npcId === npc.npcId}
              onSelect={() => handleSelect(npc.npcId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
