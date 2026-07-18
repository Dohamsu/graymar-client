"use client";
// [arch/77 P5c] NPC 초상화 카드 — StoryBlock.tsx에서 분리.
import { useState, useEffect } from "react";
import Image from "next/image";
import type { StoryMessage } from "@/types/game";

export function NpcPortraitCard({ npcPortrait }: { npcPortrait: NonNullable<StoryMessage['npcPortrait']> }) {
  const [phase, setPhase] = useState<'hidden' | 'slide' | 'name' | 'badge'>('hidden');

  // 복합 카드 지원 (bug 4737): npcs 배열이 있으면 여러 NPC, 아니면 단일
  const npcs = npcPortrait.npcs ?? [
    {
      npcId: npcPortrait.npcId,
      npcName: npcPortrait.npcName,
      imageUrl: npcPortrait.imageUrl,
      isNewlyIntroduced: npcPortrait.isNewlyIntroduced,
    },
  ];
  const isCompound = npcs.length > 1;
  const maxNameLen = Math.max(...npcs.map((n) => n.npcName.length));

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('slide'), 50);
    const t2 = setTimeout(() => setPhase('name'), 550);
    const t3 = setTimeout(() => setPhase('badge'), 550 + maxNameLen * 60 + 200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [maxNameLen]);

  const isSlideIn = phase !== 'hidden';
  const showName = phase === 'name' || phase === 'badge';
  const showBadge = phase === 'badge';

  // 뱃지 텍스트
  const badgeText = (() => {
    if (isCompound) {
      const names = npcs.map((n) => n.npcName).join(', ');
      return `첫 만남: ${names}`;
    }
    return npcs[0].isNewlyIntroduced ? '이름이 밝혀졌다' : '첫 만남';
  })();

  return (
    <div
      className="mb-3 flex flex-col gap-2 rounded-lg p-3 transition-all duration-500"
      style={{
        opacity: isSlideIn ? 1 : 0,
        transform: isSlideIn ? 'translateX(0)' : 'translateX(-20px)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* 초상화 가로 배열 */}
        <div className="flex shrink-0 items-center">
          {npcs.map((npc, idx) => (
            <div
              key={npc.npcId}
              className="relative h-20 w-20 overflow-hidden rounded-lg"
              style={{
                boxShadow: isSlideIn
                  ? '0 0 12px rgba(255, 215, 0, 0.3), 0 0 4px rgba(255, 215, 0, 0.2)'
                  : 'none',
                border: '2px solid var(--gold)',
                transition: 'box-shadow 0.8s ease-out',
                // 복합 카드 시 초상화 겹침 효과 (각 초상화 -8px 겹침)
                marginLeft: idx > 0 ? '-8px' : 0,
                zIndex: npcs.length - idx,
              }}
            >
              <Image
                src={npc.imageUrl}
                alt={npc.npcName}
                fill
                sizes="80px"
                className="object-cover"
              />
              {isSlideIn && idx === 0 && (
                <div
                  className="pointer-events-none absolute inset-0 animate-[npcShimmer_2s_ease-in-out]"
                  style={{
                    background:
                      'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.15) 50%, transparent 60%)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          {/* 이름 리스트 */}
          {showName && (
            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
              {npcs.map((npc, idx) => (
                <span
                  key={npc.npcId}
                  className="text-sm font-semibold font-display animate-[npcNameFade_0.4s_ease-out]"
                  style={{
                    color: 'var(--text-primary)',
                    animationDelay: `${idx * 150}ms`,
                  }}
                >
                  {npc.npcName}
                  {idx < npcs.length - 1 && (
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>,</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {/* 뱃지 */}
          {showBadge && (
            <span
              className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold animate-[npcBadgeBounce_0.4s_ease-out]"
              style={{
                color: 'var(--gold)',
                border: '1px solid var(--gold)',
                backgroundColor: 'rgba(255, 215, 0, 0.06)',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoryBlock
// ---------------------------------------------------------------------------
