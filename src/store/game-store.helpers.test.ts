// applyServerResultUi 유닛 (하네스 보강 #2, 2026-08-06)
// 서버 턴 응답 UI 번들 → 스토어 반영의 단일 수렴점. 이 층의 실버그 이력
// (threads successRate 0% 고정, HUB 턴 스테일, 배지 감지 — arch/99)이
// 전부 "타입은 맞는데 값 반영 조건이 틀린" 형태라 값 수준 계약을 고정한다.
import { describe, it, expect } from 'vitest';
import { applyServerResultUi } from './game-store.helpers';
import type { GameState } from './game-store';
import type { ServerResultV1, QuestStatusUI } from '@/types/game';

/** 최소 스토어 흉내 — set 호출 누적 + 상태 병합 */
function makeStore(initial: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = {
    battleState: null,
    signalFeed: [],
    questStatus: null,
    questTabBadge: false,
    ...initial,
  };
  const sets: Array<Record<string, unknown>> = [];
  const set = (partial: Partial<GameState>) => {
    Object.assign(state, partial);
    sets.push(partial as Record<string, unknown>);
  };
  const get = () => state as unknown as GameState;
  /** 전체 set 호출에서 특정 키가 등장했는지 */
  const wasSet = (key: string) => sets.some((p) => key in p);
  return { state, set, get, wasSet };
}

function result(ui: Record<string, unknown>, diff?: Record<string, unknown>): ServerResultV1 {
  return { ui, diff: diff ?? {} } as unknown as ServerResultV1;
}

const qs = (facts: number, stateIndex: number): QuestStatusUI =>
  ({
    questId: 'Q', title: 'T', state: `S${stateIndex}`, stateIndex, totalStates: 6,
    stateDescription: null,
    discoveredFacts: Array.from({ length: facts }, (_, i) => ({ factId: `F${i}`, description: `d${i}` })),
    nextObjectives: [], directionHint: null, terminal: false,
    factionNames: {}, arcRouteLabels: {},
  }) as QuestStatusUI;

describe('applyServerResultUi — questStatus·배지 (arch/99)', () => {
  it('questStatus가 번들에 있으면 반영한다', () => {
    const s = makeStore();
    applyServerResultUi(result({ questStatus: qs(1, 0) }), s.get, s.set);
    expect((s.state.questStatus as QuestStatusUI).discoveredFacts).toHaveLength(1);
  });

  it('questStatus가 번들에 없으면 이전 값을 유지한다 (HUB 스테일 방어의 클라 측 반쪽)', () => {
    const s = makeStore({ questStatus: qs(2, 1) });
    applyServerResultUi(result({}), s.get, s.set);
    expect(s.wasSet('questStatus')).toBe(false);
    expect((s.state.questStatus as QuestStatusUI).stateIndex).toBe(1);
  });

  it('단서 수 증가 시 배지를 점등한다', () => {
    const s = makeStore({ questStatus: qs(1, 0) });
    applyServerResultUi(result({ questStatus: qs(2, 0) }), s.get, s.set);
    expect(s.state.questTabBadge).toBe(true);
  });

  it('단계 전진 시 배지를 점등한다', () => {
    const s = makeStore({ questStatus: qs(2, 0) });
    applyServerResultUi(result({ questStatus: qs(2, 1) }), s.get, s.set);
    expect(s.state.questTabBadge).toBe(true);
  });

  it('변화 없으면 배지를 건드리지 않는다', () => {
    const s = makeStore({ questStatus: qs(2, 1) });
    applyServerResultUi(result({ questStatus: qs(2, 1) }), s.get, s.set);
    expect(s.wasSet('questTabBadge')).toBe(false);
  });

  it('이전 questStatus가 없으면(첫 수신·복원 직후) 배지를 점등하지 않는다', () => {
    const s = makeStore({ questStatus: null });
    applyServerResultUi(result({ questStatus: qs(3, 2) }), s.get, s.set);
    expect(s.wasSet('questTabBadge')).toBe(false);
  });
});

describe('applyServerResultUi — 퀘스트/아크 번들', () => {
  it('arcState·narrativeMarks·mainArcClock·day·playerThreads를 존재할 때만 반영한다', () => {
    const s = makeStore({ arcState: { currentRoute: 'ALLY_GUARD' }, day: 3 });
    applyServerResultUi(
      result({
        narrativeMarks: [{ type: 'WITNESS' }],
        mainArcClock: { startDay: 1, softDeadlineDay: 14, triggered: false },
        day: 4,
        playerThreads: [{ threadId: 't1', approachVector: 'SOCIAL', goalCategory: 'GET_INFO', actionCount: 2, successCount: 1, failCount: 1, status: 'EMERGING' }],
      }),
      s.get, s.set,
    );
    // arcState는 번들에 없었다 — 이전 값 유지 (undefined 덮어쓰기 금지)
    expect(s.wasSet('arcState')).toBe(false);
    expect((s.state.arcState as { currentRoute: string }).currentRoute).toBe('ALLY_GUARD');
    expect(s.state.day).toBe(4);
    expect(s.state.narrativeMarks).toHaveLength(1);
    expect(s.state.mainArcClock).toMatchObject({ softDeadlineDay: 14 });
    expect(s.state.playerThreads).toHaveLength(1);
  });

  it('activeIncidents를 반영한다', () => {
    const s = makeStore();
    applyServerResultUi(
      result({ activeIncidents: [{ incidentId: 'i1', title: 'x', kind: 'CRIMINAL', stage: 0, control: 50, pressure: 10, resolved: false }] }),
      s.get, s.set,
    );
    expect(s.state.activeIncidents).toHaveLength(1);
  });
});

describe('applyServerResultUi — worldState·resolveOutcome·shops', () => {
  it('worldState 반영 시 playerGoals·locationDynamicStates도 함께 전파한다', () => {
    const s = makeStore();
    applyServerResultUi(
      result({
        worldState: {
          hubHeat: 10, hubSafety: 'SAFE', timePhase: 'DAY', day: 2,
          playerGoals: [{ id: 'g1', type: 'IMPLICIT', description: 'd', progress: 30, milestones: [], completed: false }],
          locationDynamicStates: { LOC_MARKET: { mood: 'busy' } },
        },
      }),
      s.get, s.set,
    );
    expect(s.state.playerGoals).toHaveLength(1);
    expect(s.state.locationDynamicStates).toHaveProperty('LOC_MARKET');
  });

  it('resolveOutcome은 부재 시 null로 초기화한다 (직전 턴 잔상 방지)', () => {
    const s = makeStore({ resolveOutcome: 'SUCCESS' });
    applyServerResultUi(result({}), s.get, s.set);
    expect(s.state.resolveOutcome).toBeNull();
  });

  it('shops는 번들에 없으면 빈 배열로 초기화한다 (장소 이탈 시 진열 제거)', () => {
    const s = makeStore({ shops: [{ shopId: 'sh1', name: 'x', items: [] }] });
    applyServerResultUi(result({}), s.get, s.set);
    expect(s.state.shops).toEqual([]);
  });
});

describe('applyServerResultUi — 전투 diff', () => {
  it('diff.enemies로 battleState의 해당 적 HP만 갱신한다', () => {
    const s = makeStore({
      battleState: { enemies: [{ id: 'e1', hp: 30, status: [] }, { id: 'e2', hp: 20, status: [] }] },
    });
    applyServerResultUi(
      result({}, { enemies: [{ enemyId: 'e1', hp: { from: 30, to: 18, delta: -12 }, status: [] }] }),
      s.get, s.set,
    );
    const enemies = (s.state.battleState as { enemies: Array<{ hp: number }> }).enemies;
    expect(enemies[0]!.hp).toBe(18);
    expect(enemies[1]!.hp).toBe(20);
  });

  it('battleState가 없으면 diff.enemies가 있어도 무시한다', () => {
    const s = makeStore({ battleState: null });
    applyServerResultUi(
      result({}, { enemies: [{ enemyId: 'e1', hp: { from: 1, to: 0, delta: -1 }, status: [] }] }),
      s.get, s.set,
    );
    expect(s.state.battleState).toBeNull();
  });
});
