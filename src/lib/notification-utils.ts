import type { GameNotification } from '@/types/game';

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MID: 2,
  LOW: 3,
};

/** 두 notification 배열을 합치며 dedupeKey 기준 중복 제거 */
export function mergeNotifications(
  existing: GameNotification[],
  incoming: GameNotification[],
): GameNotification[] {
  const seen = new Set<string>();
  const result: GameNotification[] = [];

  for (const n of [...existing, ...incoming]) {
    const key = n.dedupeKey ?? n.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(n);
  }

  return result;
}

/** dedupeKey 기준 중복 제거 */
export function dedupeNotifications(notifications: GameNotification[]): GameNotification[] {
  const seen = new Set<string>();
  return notifications.filter((n) => {
    const key = n.dedupeKey ?? n.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** priority(CRITICAL→LOW) → turnNo(최신 우선) 정렬 */
export function sortNotifications(notifications: GameNotification[]): GameNotification[] {
  return [...notifications].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.turnNo - a.turnNo;
  });
}

/** expiresAtTurn이 현재 턴 이하인 알림 제거 */
export function dropExpired(
  notifications: GameNotification[],
  currentTurnNo: number,
): GameNotification[] {
  return notifications.filter(
    (n) => !n.expiresAtTurn || n.expiresAtTurn > currentTurnNo,
  );
}
