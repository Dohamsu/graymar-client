"use client";

import { Skull, Shield, Target } from "lucide-react";
import type { BattleEnemy } from "@/types/game";

// architecture/42 전투 UI 버튼 폼 — 적 카드 (클릭으로 타겟 선택)

const DISTANCE_LABELS: Record<string, string> = {
  ENGAGED: '밀착', CLOSE: '근거리', MID: '중거리', FAR: '원거리', OUT: '전장 밖',
};
const ANGLE_LABELS: Record<string, string> = {
  FRONT: '정면', SIDE: '측면', BACK: '후방',
};
const STATUS_LABELS: Record<string, string> = {
  BLEED: '출혈', POISON: '중독', STUN: '기절', WEAKEN: '약화', FORTIFY: '강화',
};

interface EnemyCardProps {
  enemy: BattleEnemy;
  selected?: boolean;
  onSelect?: (enemyId: string) => void;
}

export function EnemyCard({ enemy, selected = false, onSelect }: EnemyCardProps) {
  const maxHp = enemy.maxHp ?? enemy.hp;
  const hpPct = maxHp > 0 ? Math.round((enemy.hp / maxHp) * 100) : 0;
  const isDead = enemy.hp <= 0;
  const displayName = enemy.name ?? enemy.id.replace(/_/g, " ");

  const borderColor = isDead
    ? 'var(--text-muted)'
    : selected
      ? 'var(--gold)'
      : 'var(--hp-red)';
  const borderWidth = selected && !isDead ? '2px' : '1px';
  const clickable = !isDead && onSelect !== undefined;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? () => onSelect!(enemy.id) : undefined}
      className={`flex flex-col gap-2 rounded-md p-3 text-left transition-all ${
        clickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
      } ${selected && !isDead ? 'bg-[var(--gold)]/8 shadow-[0_0_0_1px_var(--gold)]' : ''}`}
      style={{
        borderStyle: 'solid',
        borderColor,
        borderWidth,
        opacity: isDead ? 0.4 : 1,
      }}
      aria-pressed={selected}
      aria-label={`${displayName} ${isDead ? '사망' : selected ? '선택됨' : '선택'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDead ? (
            <Skull size={14} className="text-[var(--text-muted)]" />
          ) : selected ? (
            <Target size={14} className="text-[var(--gold)]" />
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
    </button>
  );
}
