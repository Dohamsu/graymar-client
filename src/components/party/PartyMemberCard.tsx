"use client";

import { Crown, Check } from "lucide-react";
import Image from "next/image";

// ── Types ──

interface PartyMember {
  userId: string;
  nickname: string;
  presetId: string;
  presetLabel: string;
  level: number;
  hp: number;
  maxHp: number;
  portraitUrl?: string | null;
  isLeader: boolean;
  isReady: boolean;
  isOnline: boolean;
}

interface PartyMemberCardProps {
  member?: PartyMember | null;
  isSelf?: boolean;
}

/** Map preset ID to a default portrait path */
function defaultPortrait(presetId: string): string {
  return `/images/presets/${presetId.toLowerCase()}.webp`;
}

export function PartyMemberCard({ member, isSelf = false }: PartyMemberCardProps) {
  // ── Empty Slot ──
  if (!member) {
    return (
      <div className="flex h-[160px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 sm:h-[200px]">
        <div className="mb-2 h-12 w-12 rounded-full border-2 border-dashed border-[var(--border-primary)]" />
        <span className="text-xs text-[var(--text-muted)]">대기 중...</span>
      </div>
    );
  }

  const hpPercent = member.maxHp > 0 ? Math.round((member.hp / member.maxHp) * 100) : 0;

  return (
    <div
      className={`relative flex w-full flex-col items-center rounded-lg border bg-[var(--bg-secondary)] p-3 transition-colors sm:p-4 ${
        isSelf
          ? "border-[var(--gold)]/40"
          : "border-[var(--border-primary)]"
      }`}
    >
      {/* Leader badge */}
      {member.isLeader && (
        <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold)] shadow-md">
          <Crown size={12} className="text-[var(--bg-primary)]" />
        </div>
      )}

      {/* Online indicator */}
      <div className="absolute top-2 left-2">
        {member.isOnline ? (
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--success-green)]" />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
          </div>
        )}
      </div>

      {/* Portrait */}
      <div className="relative mb-2 h-14 w-14 overflow-hidden rounded-full border-2 border-[var(--border-primary)] sm:h-16 sm:w-16">
        <Image
          src={member.portraitUrl || defaultPortrait(member.presetId)}
          alt={member.nickname}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      {/* Name */}
      <span className="mb-0.5 max-w-full truncate text-sm font-semibold text-[var(--text-primary)]">
        {member.nickname}
      </span>

      {/* Preset + Level */}
      <span className="mb-2 text-[11px] text-[var(--text-muted)]">
        {member.presetLabel} Lv.{member.level}
      </span>

      {/* HP bar */}
      <div className="mb-2 w-full">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${hpPercent}%`,
              backgroundColor:
                hpPercent > 50
                  ? "var(--stamina-green)"
                  : hpPercent > 25
                    ? "var(--orange)"
                    : "var(--hp-red)",
            }}
          />
        </div>
        <div className="mt-0.5 text-center text-[10px] text-[var(--text-muted)]">
          {member.hp}/{member.maxHp}
        </div>
      </div>

      {/* Ready state */}
      {member.isReady ? (
        <div className="flex items-center gap-1 rounded-full bg-[var(--success-green)]/10 px-2.5 py-1 text-[10px] font-medium text-[var(--success-green)]">
          <Check size={10} />
          준비 완료
        </div>
      ) : (
        <div className="rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[10px] text-[var(--text-muted)]">
          준비 중
        </div>
      )}
    </div>
  );
}
