"use client";

import { Skull, Shield } from "lucide-react";
import type { BattleEnemy } from "@/types/game";

const DISTANCE_LABELS: Record<string, string> = {
  ENGAGED: '밀착', CLOSE: '근거리', MID: '중거리', FAR: '원거리', OUT: '전장 밖',
};
const ANGLE_LABELS: Record<string, string> = {
  FRONT: '정면', SIDE: '측면', BACK: '후방',
};
const STATUS_LABELS: Record<string, string> = {
  BLEED: '출혈', POISON: '중독', STUN: '기절', WEAKEN: '약화', FORTIFY: '강화',
};

interface BattlePanelProps {
  enemies: BattleEnemy[];
}

function EnemyCard({ enemy }: { enemy: BattleEnemy }) {
  const maxHp = enemy.maxHp ?? enemy.hp;
  const hpPct = maxHp > 0 ? Math.round((enemy.hp / maxHp) * 100) : 0;
  const isDead = enemy.hp <= 0;
  const displayName = enemy.name ?? enemy.id.replace(/_/g, " ");

  return (
    <div
      className="flex flex-col gap-2 rounded-md border p-3"
      style={{
        borderColor: isDead ? "var(--text-muted)" : "var(--hp-red)",
        opacity: isDead ? 0.4 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDead ? (
            <Skull size={14} className="text-[var(--text-muted)]" />
          ) : (
            <Shield size={14} className="text-[var(--hp-red)]" />
          )}
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {displayName}
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">
          {DISTANCE_LABELS[enemy.distance] ?? enemy.distance} / {ANGLE_LABELS[enemy.angle] ?? enemy.angle}
        </span>
      </div>

      {/* HP Bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-primary)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${hpPct}%`,
              backgroundColor: isDead
                ? "var(--text-muted)"
                : hpPct > 50
                  ? "var(--hp-red)"
                  : hpPct > 25
                    ? "var(--orange)"
                    : "var(--hp-red)",
            }}
          />
        </div>
        <span className="text-[10px] text-[var(--text-secondary)]">
          {enemy.hp}/{maxHp}
        </span>
      </div>

      {/* Status effects */}
      {enemy.status.length > 0 && (
        <div className="flex gap-1">
          {enemy.status.map((s) => (
            <span
              key={s.id}
              className="rounded bg-[var(--border-primary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]"
            >
              {STATUS_LABELS[s.id] ?? s.id} x{s.stacks}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BattlePanel({ enemies }: BattlePanelProps) {
  if (!enemies || enemies.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--hp-red)]">
        적
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {enemies.map((enemy) => (
          <EnemyCard key={enemy.id} enemy={enemy} />
        ))}
      </div>
    </div>
  );
}
