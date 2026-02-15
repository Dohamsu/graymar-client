import type { PlayerHud, BattleEnemy, InventoryItem } from '@/types/game';

export function applyDiffToHud(
  hud: PlayerHud,
  diff: {
    player: {
      hp: { to: number; delta: number };
      stamina: { to: number; delta: number };
    };
    inventory: { goldDelta: number };
  },
): PlayerHud {
  return {
    ...hud,
    hp: diff.player.hp.delta !== 0 ? diff.player.hp.to : hud.hp,
    stamina: diff.player.stamina.delta !== 0 ? diff.player.stamina.to : hud.stamina,
    gold: hud.gold + diff.inventory.goldDelta,
  };
}

/**
 * diff.inventory의 itemsAdded/Removed로 인벤토리를 갱신한 새 배열 반환
 */
export function applyInventoryDiff(
  inventory: InventoryItem[],
  diff: {
    itemsAdded: Array<{ itemId: string; qty: number }>;
    itemsRemoved: Array<{ itemId: string; qty: number }>;
  },
): InventoryItem[] {
  const result = inventory.map((item) => ({ ...item }));

  for (const added of diff.itemsAdded ?? []) {
    const existing = result.find((i) => i.itemId === added.itemId);
    if (existing) {
      existing.qty += added.qty;
    } else {
      result.push({ itemId: added.itemId, qty: added.qty });
    }
  }

  for (const removed of diff.itemsRemoved ?? []) {
    const existing = result.find((i) => i.itemId === removed.itemId);
    if (existing) {
      existing.qty -= removed.qty;
    }
  }

  return result.filter((i) => i.qty > 0);
}

/**
 * diff.enemies로 battleState.enemies를 갱신한 새 배열 반환
 */
export function applyEnemyDiffs(
  enemies: BattleEnemy[],
  diffs: Array<{
    enemyId: string;
    hp: { from: number; to: number; delta: number };
    status: unknown[];
    distance?: string;
    angle?: string;
  }>,
): BattleEnemy[] {
  return enemies.map((e) => {
    const d = diffs.find((ed) => ed.enemyId === e.id);
    if (!d) return e;
    return {
      ...e,
      hp: d.hp.to,
      status: applyStatusDeltas(e.status, d.status),
      ...(d.distance ? { distance: d.distance } : {}),
      ...(d.angle ? { angle: d.angle } : {}),
    };
  });
}

function applyStatusDeltas(
  current: BattleEnemy['status'],
  deltas: unknown[],
): BattleEnemy['status'] {
  if (!deltas || deltas.length === 0) return current;

  const result = [...current];
  for (const raw of deltas) {
    const delta = raw as { type: string; id: string; stacks?: number; duration?: number };
    if (delta.type === 'ADD') {
      result.push({ id: delta.id, stacks: delta.stacks ?? 1, duration: delta.duration ?? 1 });
    } else if (delta.type === 'REMOVE') {
      const idx = result.findIndex((s) => s.id === delta.id);
      if (idx >= 0) result.splice(idx, 1);
    } else if (delta.type === 'UPDATE') {
      const existing = result.find((s) => s.id === delta.id);
      if (existing) {
        if (delta.stacks !== undefined) existing.stacks = delta.stacks;
        if (delta.duration !== undefined) existing.duration = delta.duration;
      }
    }
  }
  return result;
}
