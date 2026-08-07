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
  FRIENDLY: { label: "우호", color: "#8FAC7E" },
  CAUTIOUS: { label: "경계", color: "#C9A962" },
  HOSTILE: { label: "적대", color: "#C0625A" },
  FEARFUL: { label: "두려움", color: "#A08CC0" },
  CALCULATING: { label: "계산적", color: "#8FA9C4" },
};

const EMOTION_CONFIG: {
  key: keyof Pick<NpcEmotionalUI, 'trust' | 'fear' | 'respect' | 'suspicion' | 'attachment'>;
  label: string;
  color: string;
  /** 양극 축(-100~100, 중앙 기준) 여부 — 서버 CLAMP_BIPOLAR와 동기 */
  bipolar: boolean;
}[] = [
  { key: "trust", label: "신뢰", color: "#8FAC7E", bipolar: true },
  { key: "fear", label: "공포", color: "#C0625A", bipolar: false },
  { key: "respect", label: "존경", color: "#C9A962", bipolar: true },
  { key: "suspicion", label: "의심", color: "#A08CC0", bipolar: false },
  { key: "attachment", label: "유대", color: "#8FA9C4", bipolar: false },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Emotion bar with label
 *  대비 리튠 2차 (UIUX 점검 2026-08-07): 포스터 텍스처가 밝은 양피지가 아니라
 *  중간~어두운 갈색 낡은 종이라 잉크색(짙은 갈색) 텍스트가 안 읽히던 것 —
 *  블록을 반투명 검정 패널(컨테이너 쪽)로 감싸고 텍스트를 밝은 크림으로 반전.
 *  같은 탭 빈 상태 카드(bg-black/40 + 밝은 텍스트)와 동일 패턴. */
function EmotionBar({
  label,
  value,
  color,
  bipolar,
}: {
  label: string;
  value: number;
  color: string;
  bipolar: boolean;
}) {
  // 감정 점검 2026-08-07 — 축별 스케일 분리:
  // · 단극 축(fear/suspicion/attachment, 서버 0~100): 좌측 기준 값 그대로의 폭.
  //   기존엔 ±100 정규화를 일괄 적용해 실제 값의 절반 폭으로 렌더되던 버그.
  // · 양극 축(trust/respect, 서버 -100~100): 중앙 기준, 표시 스케일 ±50 캡 —
  //   실질 가동 범위(±40 임계가 '깊은 신뢰/경멸')에 맞춰 체감 확대.
  const isNegative = value < 0;
  const bipolarWidth = Math.min(50, Math.abs(value));

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[10px] font-semibold" style={{ color: "#e9dcbe" }}>
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/15">
        {bipolar && (
          <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-white/30" />
        )}
        {value !== 0 && (
          <div
            className="absolute top-0 h-full rounded-full transition-all duration-500"
            style={
              bipolar
                ? {
                    left: isNegative ? `${50 - bipolarWidth}%` : "50%",
                    width: `${bipolarWidth}%`,
                    backgroundColor: color,
                  }
                : {
                    left: 0,
                    width: `${Math.max(0, Math.min(100, value))}%`,
                    backgroundColor: color,
                  }
            }
          />
        )}
      </div>
      <span className="w-7 text-right text-[10px] font-bold" style={{ color: "#f3e8cd" }}>
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
            loading="eager"
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
        style={{ backgroundImage: "url('/textures/tavern-wall.webp')", backgroundColor: "#1e1812" }}
      >
        <div className="flex flex-col items-center gap-3 rounded-lg bg-black/40 px-6 py-8 backdrop-blur-sm">
          <Eye size={32} className="text-[var(--gold)]/60" />
          <p className="text-center text-sm text-[var(--gold)]/80">
            아직 만난 인물이 없다
          </p>
          <p className="text-center text-[10px] text-[var(--text-muted)]">
            이 땅의 인물들과 교류하면 이곳에 기록됩니다
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
      // fallback 배경색 — 텍스처 로드 전에도 톤 유지 (순차 노출 체감 완화)
      style={{ backgroundImage: "url('/textures/tavern-wall.webp')", backgroundColor: "#1e1812" }}
    >
      {/* Selected NPC — Wanted Poster Card */}
      {selectedNpc && (
        <div
          className="relative flex shrink-0 flex-col items-center gap-3 overflow-hidden rounded-lg bg-cover bg-center px-5 py-5 shadow-lg"
          // fallback 양피지 톤 — 텍스처 로드 전 다크 배경 위 짙은 잉크색 텍스트가
          // 안 보이던 대비 붕괴 방지 (UIUX 점검 2026-08-07)
          style={{ backgroundImage: "url('/textures/wanted-poster.webp')", backgroundColor: "#d6c39a" }}
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
                priority
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

          {/* Emotion Bars — 반투명 검정 패널로 텍스처 밝기 무관 대비 보장 */}
          <div className="mt-1 flex w-full flex-col gap-1.5 rounded-md bg-black/35 px-2.5 py-2">
            {EMOTION_CONFIG.map(({ key, label, color, bipolar }) => (
              <EmotionBar
                key={key}
                label={label}
                value={selectedNpc[key]}
                color={color}
                bipolar={bipolar}
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
