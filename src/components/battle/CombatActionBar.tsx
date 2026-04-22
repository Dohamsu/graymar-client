"use client";

import { Sword, Shield as ShieldIcon, FlaskConical, Sparkles, Wind, Zap, Rabbit, MoveRight, MoveLeft, Cloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import { ITEM_CATALOG } from "@/data/items";
import type { BattleEnemy } from "@/types/game";

// architecture/42 전투 UI 버튼 폼 — 주요 5 + 특수 펼침

interface CombatActionBarProps {
  enemies: BattleEnemy[];
  onChoiceSelect: (choiceId: string) => void;
  onOpenItemModal: () => void;
  disabled?: boolean;
}

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  color?: string;
  hint?: string;
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  color,
  hint,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={hint}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 ${
        active
          ? 'border-[var(--gold)] bg-[var(--gold)]/15'
          : 'border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
      }`}
      style={color ? { color } : undefined}
    >
      <Icon size={18} className="sm:size-5" style={color ? { color } : undefined} />
      <span className="text-[9px] font-medium text-[var(--text-primary)] sm:text-[10px]">
        {label}
      </span>
    </button>
  );
}

export function CombatActionBar({
  enemies,
  onChoiceSelect,
  onOpenItemModal,
  disabled = false,
}: CombatActionBarProps) {
  const targetId = useGameStore((s) => s.combatSelectedTargetId);
  const expandedPanel = useGameStore((s) => s.combatExpandedPanel);
  const setExpanded = useGameStore((s) => s.setCombatExpandedPanel);
  const stamina = useGameStore((s) => s.hud.stamina);
  const inventory = useGameStore((s) => s.inventory);

  const aliveEnemies = enemies.filter((e) => e.hp > 0);
  const selectedEnemy = aliveEnemies.find((e) => e.id === targetId);

  // 거리 기반 이동 버튼 활성화
  const hasFarEnemy = aliveEnemies.some(
    (e) => e.distance === 'FAR' || e.distance === 'MID',
  );
  const hasEngagedEnemy = aliveEnemies.some(
    (e) => e.distance === 'ENGAGED',
  );

  // 아이템 버튼: inventory에 CONSUMABLE 있을 때만 활성
  const hasCombatItems = inventory.some((item) => {
    if (item.qty <= 0) return false;
    const meta = ITEM_CATALOG[item.itemId];
    return meta?.type === 'CONSUMABLE';
  });

  if (aliveEnemies.length === 0) return null;

  const canAttack = !!selectedEnemy && (selectedEnemy.distance === 'ENGAGED' || selectedEnemy.distance === 'CLOSE');
  const canCombo = canAttack && stamina >= 2;

  const doAction = (choiceId: string) => {
    if (disabled) return;
    onChoiceSelect(choiceId);
    setExpanded('none');
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-3 sm:px-3">
      {/* 타겟 표시 */}
      {selectedEnemy && (
        <div className="flex items-center gap-2 px-1 text-[10px] text-[var(--text-muted)]">
          <span>타겟:</span>
          <span className="font-semibold text-[var(--gold)]">
            {selectedEnemy.name ?? selectedEnemy.id}
          </span>
        </div>
      )}

      {/* 주요 5 버튼 */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <ActionButton
          icon={Sword}
          label="공격"
          color="var(--hp-red)"
          onClick={() =>
            selectedEnemy && doAction(`attack_melee_${selectedEnemy.id}`)
          }
          disabled={!canAttack || disabled}
          hint={
            !canAttack
              ? '선택된 적이 근접 거리여야 합니다'
              : '근접 공격'
          }
        />
        <ActionButton
          icon={ShieldIcon}
          label="방어"
          color="var(--info-blue)"
          onClick={() => doAction('defend')}
          disabled={disabled}
          hint="방어 태세 (스태미나 회복)"
        />
        <ActionButton
          icon={FlaskConical}
          label="아이템"
          color="var(--success-green)"
          onClick={onOpenItemModal}
          disabled={!hasCombatItems || disabled}
          hint={hasCombatItems ? '전투 아이템 사용' : '사용 가능한 아이템 없음'}
        />
        <ActionButton
          icon={Sparkles}
          label="특수"
          color="var(--purple)"
          onClick={() => setExpanded('special')}
          active={expandedPanel === 'special'}
          disabled={disabled}
          hint="특수 행동 (연속 공격/환경/이동/회피)"
        />
        <ActionButton
          icon={Rabbit}
          label="이탈"
          color="var(--gold)"
          onClick={() => doAction('combat_avoid')}
          disabled={disabled}
          hint="전투 이탈 (회피/도주 통합)"
        />
      </div>

      {/* 특수 펼침 */}
      {expandedPanel === 'special' && (
        <div className="animate-fade-in grid grid-cols-5 gap-1.5 border-t border-[var(--border-primary)] pt-2 sm:gap-2">
          <ActionButton
            icon={Zap}
            label="연속 공격"
            color="var(--hp-red)"
            onClick={() =>
              selectedEnemy &&
              doAction(`combo_double_attack_${selectedEnemy.id}`)
            }
            disabled={!canCombo || disabled}
            hint="2회 연속 공격 (기력 2)"
          />
          <ActionButton
            icon={Wind}
            label="회피 태세"
            onClick={() => doAction('evade')}
            disabled={disabled}
            hint="회피율 증가"
          />
          <ActionButton
            icon={Cloud}
            label="환경 활용"
            onClick={() => doAction('env_action')}
            disabled={disabled}
            hint="주변 환경 이용 (확률 광역)"
          />
          <ActionButton
            icon={MoveRight}
            label="전진"
            onClick={() => doAction('move_forward')}
            disabled={!hasFarEnemy || disabled}
            hint="전방으로 이동"
          />
          <ActionButton
            icon={MoveLeft}
            label="후퇴"
            onClick={() => doAction('move_back')}
            disabled={!hasEngagedEnemy || disabled}
            hint="후방으로 이동"
          />
        </div>
      )}
    </div>
  );
}
