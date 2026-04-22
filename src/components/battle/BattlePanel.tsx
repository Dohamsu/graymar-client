"use client";

import { useEffect } from "react";
import type { BattleEnemy } from "@/types/game";
import { EnemyCard } from "./EnemyCard";
import { useGameStore } from "@/store/game-store";

// architecture/42 전투 UI 버튼 폼 — 적 카드 클릭으로 타겟 선택

interface BattlePanelProps {
  enemies: BattleEnemy[];
}

export function BattlePanel({ enemies }: BattlePanelProps) {
  const selectedTargetId = useGameStore((s) => s.combatSelectedTargetId);
  const lastAttackedId = useGameStore((s) => s.combatLastAttackedTargetId);
  const setCombatTarget = useGameStore((s) => s.setCombatTarget);

  // 자동 타겟 선택: 마지막 공격한 적 우선 → 첫 ENGAGED 생존 적
  useEffect(() => {
    if (!enemies || enemies.length === 0) return;
    const current = enemies.find(
      (e) => e.id === selectedTargetId && e.hp > 0,
    );
    if (current) return; // 현재 선택이 유효하면 유지

    // 마지막 공격한 적이 살아있으면 우선
    const lastAttacked = enemies.find(
      (e) => e.id === lastAttackedId && e.hp > 0,
    );
    if (lastAttacked) {
      setCombatTarget(lastAttacked.id);
      return;
    }

    // fallback: 첫 ENGAGED 생존 적 → 첫 생존 적
    const engaged = enemies.find(
      (e) => e.hp > 0 && e.distance === 'ENGAGED',
    );
    const anyAlive = enemies.find((e) => e.hp > 0);
    setCombatTarget((engaged ?? anyAlive)?.id ?? null);
    // enemies 변경 시마다 재평가
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, lastAttackedId]);

  if (!enemies || enemies.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--hp-red)]">
        적
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
        {enemies.map((enemy) => (
          <EnemyCard
            key={enemy.id}
            enemy={enemy}
            selected={enemy.id === selectedTargetId}
            onSelect={setCombatTarget}
          />
        ))}
      </div>
    </div>
  );
}
