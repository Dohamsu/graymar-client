/** items.json 기반 정적 아이템 카탈로그 */

export interface ItemMeta {
  name: string;
  type: 'CONSUMABLE' | 'KEY_ITEM' | 'CLUE' | 'EQUIPMENT';
  description?: string;
  rarity?: string;
  slot?: string;
  icon?: string;
  image?: string;
  statBonus?: Record<string, number>;
  setId?: string;
  /** 전투 밖(HUB/LOCATION)에서 사용 버튼 노출 여부.
   *  서버 items.json의 combat.effect가 HEAL_HP/RESTORE_STAMINA일 때만 true. */
  usableInHub?: boolean;
}

/** 아이템 ID → 이미지 경로 매핑 */
export function getItemImagePath(itemId: string): string | undefined {
  const id = itemId.toLowerCase();
  return `/items/${id}.webp`;
}

/** 전투 밖 사용 가능 여부 — ITEM_CATALOG meta.usableInHub 플래그 참조. */
export function isUsableInHub(itemId: string): boolean {
  return ITEM_CATALOG[itemId]?.usableInHub === true;
}

export const ITEM_CATALOG: Record<string, ItemMeta> = {
  // --- CONSUMABLE ---
  ITEM_MINOR_HEALING: {
    name: '하급 치료제',
    type: 'CONSUMABLE',
    description: '항구 약초상에서 구할 수 있는 기본 치료약.',
    usableInHub: true,
  },
  ITEM_STAMINA_TONIC: {
    name: '체력 강장제',
    type: 'CONSUMABLE',
    description: '쓴맛이 강한 허브 음료. 기력을 일시적으로 회복한다.',
    usableInHub: true,
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
    usableInHub: true,
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

  // --- EQUIPMENT ---
  EQ_DOCK_CUTLASS: {
    name: '부두 만도',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'WEAPON',
    icon: 'sword',
    statBonus: { atk: 3, speed: 1 },
    setId: 'SET_HARBOR_WARRIOR',
  },
  EQ_DOCK_VEST: {
    name: '두꺼운 방수 조끼',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'ARMOR',
    icon: 'shirt',
    statBonus: { def: 3, maxHP: 10 },
    setId: 'SET_HARBOR_WARRIOR',
  },
  EQ_DOCK_BOOTS: {
    name: '항만 전투화',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'TACTICAL',
    icon: 'hard-hat',
    statBonus: { eva: 2, speed: 2 },
    setId: 'SET_HARBOR_WARRIOR',
  },
  EQ_MERCHANT_LEDGER: {
    name: '상인 길드 원장',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'POLITICAL',
    icon: 'gem',
    statBonus: { acc: 2 },
    setId: 'SET_GUILD_DIPLOMAT',
  },
  EQ_MERCHANT_RING: {
    name: '상단 인장 반지',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'POLITICAL',
    icon: 'gem',
    statBonus: { acc: 1, speed: 1 },
    setId: 'SET_GUILD_DIPLOMAT',
  },
  EQ_MERCHANT_CLOAK: {
    name: '길드 외교관 망토',
    type: 'EQUIPMENT',
    rarity: 'UNIQUE',
    slot: 'ARMOR',
    icon: 'shirt',
    statBonus: { def: 2, resist: 3 },
    setId: 'SET_GUILD_DIPLOMAT',
  },
  EQ_RUSTY_BLADE: {
    name: '녹슨 단검',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'WEAPON',
    icon: 'sword',
    statBonus: { atk: 2 },
  },
  EQ_SHADOW_DAGGER: {
    name: '암살자의 단도',
    type: 'EQUIPMENT',
    rarity: 'UNIQUE',
    slot: 'WEAPON',
    icon: 'sword',
    statBonus: { atk: 4, crit: 5, critDmg: 20 },
  },
  EQ_PATROL_ARMOR: {
    name: '순찰대 경갑',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'ARMOR',
    icon: 'shirt',
    statBonus: { def: 4, maxHP: 15 },
  },
  EQ_SCOUTS_GOGGLES: {
    name: '정찰병 고글',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'TACTICAL',
    icon: 'hard-hat',
    statBonus: { acc: 3, eva: 1 },
  },
  EQ_HARBOR_SEAL: {
    name: '항만 관리관의 봉인',
    type: 'EQUIPMENT',
    rarity: 'UNIQUE',
    slot: 'POLITICAL',
    icon: 'gem',
    statBonus: { acc: 3, resist: 2 },
  },
  EQ_RELIC_TIDE_COMPASS: {
    name: '조류의 나침반',
    type: 'EQUIPMENT',
    rarity: 'LEGENDARY',
    slot: 'RELIC',
    icon: 'gem',
    statBonus: { acc: 5, speed: 3, resist: 3 },
  },
  EQ_SMUGGLER_DAGGER: {
    name: '밀수업자의 단검',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'WEAPON',
    icon: 'sword',
    statBonus: { atk: 4, eva: 1 },
    setId: 'SET_HARBOR_SHADOW',
  },
  EQ_SHADOW_CLOAK: {
    name: '그림자 망토',
    type: 'EQUIPMENT',
    rarity: 'UNIQUE',
    slot: 'ARMOR',
    icon: 'shirt',
    statBonus: { eva: 3, speed: 2 },
    setId: 'SET_HARBOR_SHADOW',
  },
  EQ_SILENT_BOOTS: {
    name: '무음 장화',
    type: 'EQUIPMENT',
    rarity: 'RARE',
    slot: 'TACTICAL',
    icon: 'hard-hat',
    statBonus: { eva: 2, speed: 1 },
    setId: 'SET_HARBOR_SHADOW',
  },

  // --- star_sand_v1 (별빛모래) ---
  // 이미지: client/public/items/item_ss_*·eq_ss_*.webp (getItemImagePath 규약).
  // usableInHub: 서버 items.json combat.effect가 HEAL_HP/RESTORE_STAMINA일 때만 true.
  ITEM_SS_MINOR_HEALING: {
    name: '하급 심장액 물약',
    type: 'CONSUMABLE',
    description: '별고래 심장액을 옅게 희석한 치료약. 극야해안 어디서나 구할 수 있는 기본 회복제.',
    usableInHub: true,
  },
  ITEM_SS_SUPERIOR_HEALING: {
    name: '정제 심장액 물약',
    type: 'CONSUMABLE',
    description: '심장 웅덩이에서 걸러낸 고농도 심장액. 상처를 빠르게 아물게 하지만 오래 마시면 꿈에 물든다.',
    usableInHub: true,
  },
  ITEM_SS_STAMINA: {
    name: '별기름 강장제',
    type: 'CONSUMABLE',
    description: '별고래 기름을 정제한 강장제. 언 몸에 온기를 돌려 기력을 회복시킨다.',
    usableInHub: true,
  },
  ITEM_SS_DREAM_WARD: {
    name: '꿈 방호 부적',
    type: 'CONSUMABLE',
    description: '등불수녀원에서 엮은 별소금 부적. 지니면 오염된 꿈이 스며드는 것을 한동안 막아준다.',
  },
  ITEM_SS_SMOKE_VIAL: {
    name: '연막 유리병',
    type: 'CONSUMABLE',
    description: '깨뜨리면 짙은 흰 안개가 피어오르는 유리병. 추격을 따돌리거나 몸을 숨길 때 쓴다.',
  },
  ITEM_SS_STAR_CHART: {
    name: '낡은 별자리 도표',
    type: 'KEY_ITEM',
    description: '오로라 관측탑에서 흘러나온 낡은 도표. 별고래가 하늘을 가른 궤적과 오로라 누출 지점이 표시돼 있다.',
  },
  ITEM_SS_DREAM_DRUG: {
    name: '하얀 문 꿈약',
    type: 'KEY_ITEM',
    description: '검은얼음 시장에서만 도는 금지 꿈약. 복용자를 \'하얀 문\' 너머의 꿈으로 이끈다는 소문이 돈다.',
  },
  ITEM_SS_NAME_LEDGER: {
    name: '이름 장부',
    type: 'KEY_ITEM',
    description: '떠돌이 서기관이 모은 명부. 이름을 잃고 돌아온 귀환자들의 본명과 사라진 날짜가 적혀 있다.',
  },
  EQ_SS_WHALEOIL_LAMP: {
    name: '별기름 램프',
    type: 'EQUIPMENT',
    description: '부두 장인이 만든 푸른 불 램프. 별고래 배 속에서도 꺼지지 않아 어둠 속 시야와 판단을 밝힌다.',
    rarity: 'RARE',
    slot: 'TACTICAL',
    statBonus: { acc: 3, eva: 1 },
  },
  EQ_SS_DREAM_COMPASS: {
    name: '꿈 나침반',
    type: 'EQUIPMENT',
    description: '바늘이 별고래의 심장을 가리키는 기이한 나침반. 꿈과 현실의 경계에서 길을 잃지 않으며 오염된 꿈에 덜 흔들린다.',
    rarity: 'UNIQUE',
    slot: 'RELIC',
    statBonus: { acc: 3, resist: 3, speed: 2 },
  },
};
