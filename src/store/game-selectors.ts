import type { GameState } from './game-store';
import type { GameNotification } from '@/types/game';

/** scope=HUB 노티만 필터 */
export const selectHubNotifications = (state: GameState): GameNotification[] =>
  state.notifications.filter((n) => n.scope === 'HUB' || n.scope === 'GLOBAL');

/** scope=LOCATION 또는 TURN_RESULT 노티 */
export const selectLocationNotifications = (state: GameState): GameNotification[] =>
  state.notifications.filter((n) => n.scope === 'LOCATION' || n.scope === 'TURN_RESULT');

/** presentation=BANNER 노티 */
export const selectBannerNotifications = (state: GameState): GameNotification[] =>
  state.notifications.filter((n) => n.presentation === 'BANNER');

/** presentation=TOAST 노티 */
export const selectToastNotifications = (state: GameState): GameNotification[] =>
  state.notifications.filter((n) => n.presentation === 'TOAST');

/** presentation=FEED_ITEM 노티 (HUB 피드용) */
export const selectFeedNotifications = (state: GameState): GameNotification[] =>
  state.notifications.filter(
    (n) => n.presentation === 'FEED_ITEM' && (n.scope === 'HUB' || n.scope === 'GLOBAL'),
  );
