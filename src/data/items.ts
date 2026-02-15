/** items.json 기반 정적 아이템 카탈로그 */

export interface ItemMeta {
  name: string;
  type: 'CONSUMABLE' | 'KEY_ITEM' | 'CLUE';
  description?: string;
}

export const ITEM_CATALOG: Record<string, ItemMeta> = {
  // --- CONSUMABLE ---
  ITEM_MINOR_HEALING: {
    name: '하급 치료제',
    type: 'CONSUMABLE',
    description: '항구 약초상에서 구할 수 있는 기본 치료약.',
  },
  ITEM_STAMINA_TONIC: {
    name: '체력 강장제',
    type: 'CONSUMABLE',
    description: '쓴맛이 강한 허브 음료. 기력을 일시적으로 회복한다.',
  },
  ITEM_SMOKE_BOMB: {
    name: '연막탄',
    type: 'CONSUMABLE',
    description: '밀수업자들이 사용하는 조잡한 연막. 도주에 유리하다.',
  },
  ITEM_POISON_NEEDLE: {
    name: '독침',
    type: 'CONSUMABLE',
    description: '암시장에서 거래되는 소형 독침. 다음 공격에 출혈을 부여한다.',
  },
  ITEM_SUPERIOR_HEALING: {
    name: '상급 치료제',
    type: 'CONSUMABLE',
    description: '암시장에서 거래되는 고급 약재. 회복량이 크지만 비싸다.',
  },

  // --- KEY_ITEM ---
  ITEM_GUILD_BADGE: {
    name: '노동 길드 인장',
    type: 'KEY_ITEM',
    description: '하를런이 신뢰의 증표로 건넨 인장. 길드원들이 경계를 풀어준다.',
  },
  ITEM_GUARD_PERMIT: {
    name: '경비대 임시 허가증',
    type: 'KEY_ITEM',
    description: '벨론 대위가 발급한 임시 수사 허가증. 관할 시설 출입 가능.',
  },
  ITEM_SMUGGLE_MAP: {
    name: '밀수 경로 지도',
    type: 'KEY_ITEM',
    description: '쉐도우에게서 구입한 비밀 항로 지도. 밀수 네트워크의 전체 윤곽이 담겨있다.',
  },

  // --- CLUE ---
  CLUE_TORN_SHIFT_SHEET: {
    name: '찢긴 징발 교대표',
    type: 'CLUE',
  },
  CLUE_SMEARED_INK_LOG: {
    name: '잉크 번진 출입 기록',
    type: 'CLUE',
  },
  CLUE_LOCK_TAG_EAST_DOCK: {
    name: '동쪽 부두 자물쇠 인장',
    type: 'CLUE',
  },
};
