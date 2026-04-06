"use client";

import Image from "next/image";

// ── Types ──

type TurnStatus = "CHOOSING" | "SUBMITTED" | "AI_ACTING";

interface PartyHUDMember {
  userId: string;
  nickname: string;
  presetId: string;
  portraitUrl?: string | null;
  hp: number;
  maxHp: number;
  turnStatus: TurnStatus;
  isCurrentUser: boolean;
}

interface PartyHUDProps {
  members: PartyHUDMember[];
}

const STATUS_LABEL: Record<TurnStatus, string> = {
  CHOOSING: "선택 중...",
  SUBMITTED: "제출 완료",
  AI_ACTING: "AI 대행",
};

const STATUS_COLOR: Record<TurnStatus, string> = {
  CHOOSING: "var(--text-muted)",
  SUBMITTED: "var(--success-green)",
  AI_ACTING: "var(--info-blue)",
};

function defaultPortrait(presetId: string): string {
  return `/images/presets/${presetId.toLowerCase()}.webp`;
}

export function PartyHUD({ members }: PartyHUDProps) {
  if (members.length === 0) return null;

  return (
    <div className="flex w-full items-center gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] px-2 py-1.5 sm:gap-2 sm:px-3 [&]:[-webkit-overflow-scrolling:touch]">
      {members.map((m) => {
        const hpPercent = m.maxHp > 0 ? Math.round((m.hp / m.maxHp) * 100) : 0;

        return (
          <div
            key={m.userId}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 sm:gap-2 sm:px-2 ${
              m.isCurrentUser
                ? "bg-[var(--gold)]/5"
                : ""
            }`}
          >
            {/* Mini avatar */}
            <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[var(--border-primary)]">
              <Image
                src={m.portraitUrl || defaultPortrait(m.presetId)}
                alt={m.nickname}
                fill
                className="object-cover"
                sizes="24px"
              />
            </div>

            {/* Info block */}
            <div className="flex flex-col">
              {/* Name (truncated) */}
              <span className="max-w-[48px] truncate text-[10px] font-medium text-[var(--text-primary)] sm:max-w-[60px]">
                {m.nickname}
              </span>

              {/* HP mini bar */}
              <div className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-[var(--border-primary)] sm:w-12">
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
            </div>

            {/* Turn status (hidden on very small screens) */}
            <span
              className="hidden text-[9px] sm:inline"
              style={{ color: STATUS_COLOR[m.turnStatus] }}
            >
              {STATUS_LABEL[m.turnStatus]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
