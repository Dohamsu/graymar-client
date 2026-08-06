// hud-mapper 순수 함수 유닛 (하네스 보강 #2, 2026-08-06)
// 전투 HP/거리/각도·인벤토리·HUD diff 적용은 타입체크로 못 잡는 회귀가
// 잦았던 층 — 값 수준 계약을 고정한다.
import { describe, it, expect } from 'vitest';
import { applyDiffToHud, applyInventoryDiff, applyEnemyDiffs } from './hud-mapper';
import type { PlayerHud, BattleEnemy } from '@/types/game';

const baseHud = { hp: 100, maxHp: 110, stamina: 50, maxStamina: 60, gold: 45 } as PlayerHud;

describe('applyDiffToHud', () => {
  it('delta가 있으면 to 값으로 갱신한다', () => {
    const next = applyDiffToHud(baseHud, {
      player: { hp: { to: 80, delta: -20 }, stamina: { to: 40, delta: -10 } },
      inventory: { goldDelta: 0 },
    });
    expect(next.hp).toBe(80);
    expect(next.stamina).toBe(40);
  });

  it('delta 0이면 기존 값을 유지한다 (to=0 오염 방지)', () => {
    const next = applyDiffToHud(baseHud, {
      player: { hp: { to: 0, delta: 0 }, stamina: { to: 0, delta: 0 } },
      inventory: { goldDelta: 0 },
    });
    expect(next.hp).toBe(100);
    expect(next.stamina).toBe(50);
  });

  it('goldDelta는 누적 가산한다 (음수 포함)', () => {
    expect(applyDiffToHud(baseHud, {
      player: { hp: { to: 0, delta: 0 }, stamina: { to: 0, delta: 0 } },
      inventory: { goldDelta: -6 },
    }).gold).toBe(39);
  });
});

describe('applyInventoryDiff', () => {
  const inv = [{ itemId: 'ITEM_A', qty: 2 }];

  it('신규 아이템은 push, 기존 아이템은 수량 합산한다', () => {
    const next = applyInventoryDiff(inv, {
      itemsAdded: [{ itemId: 'ITEM_A', qty: 1 }, { itemId: 'ITEM_B', qty: 3 }],
      itemsRemoved: [],
    });
    expect(next).toEqual([
      { itemId: 'ITEM_A', qty: 3 },
      { itemId: 'ITEM_B', qty: 3 },
    ]);
  });

  it('제거로 qty가 0 이하가 되면 목록에서 사라진다', () => {
    const next = applyInventoryDiff(inv, {
      itemsAdded: [],
      itemsRemoved: [{ itemId: 'ITEM_A', qty: 2 }],
    });
    expect(next).toEqual([]);
  });

  it('원본 배열을 변조하지 않는다', () => {
    applyInventoryDiff(inv, { itemsAdded: [{ itemId: 'ITEM_A', qty: 5 }], itemsRemoved: [] });
    expect(inv[0]!.qty).toBe(2);
  });
});

describe('applyEnemyDiffs', () => {
  const enemies = [
    { id: 'e1', hp: 30, status: [], distance: 'MID', angle: 'FRONT' },
    { id: 'e2', hp: 20, status: [{ id: 'BLEED', stacks: 1, duration: 2 }] },
  ] as unknown as BattleEnemy[];

  it('매칭된 적만 hp를 갱신하고 나머지는 그대로 둔다', () => {
    const next = applyEnemyDiffs(enemies, [
      { enemyId: 'e1', hp: { from: 30, to: 22, delta: -8 }, status: [] },
    ]);
    expect(next[0]!.hp).toBe(22);
    expect(next[1]).toBe(enemies[1]);
  });

  it('distance/angle은 diff에 있을 때만 교체한다 (불변식 8 — per-enemy)', () => {
    const next = applyEnemyDiffs(enemies, [
      { enemyId: 'e1', hp: { from: 30, to: 30, delta: 0 }, status: [], distance: 'CLOSE' },
    ]);
    expect(next[0]!.distance).toBe('CLOSE');
    expect(next[0]!.angle).toBe('FRONT');
  });

  it('status ADD/REMOVE/UPDATE 델타를 적용한다', () => {
    const next = applyEnemyDiffs(enemies, [
      {
        enemyId: 'e2',
        hp: { from: 20, to: 20, delta: 0 },
        status: [
          { type: 'UPDATE', id: 'BLEED', stacks: 3 },
          { type: 'ADD', id: 'STUN', duration: 1 },
        ],
      },
    ]);
    expect(next[1]!.status).toEqual([
      { id: 'BLEED', stacks: 3, duration: 2 },
      { id: 'STUN', stacks: 1, duration: 1 },
    ]);
  });
});
