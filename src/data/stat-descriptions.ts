/** 스탯 한국어 이름 (소문자 키) — Living World v2: 6개 기본 스탯 */
export const STAT_KOREAN_NAMES: Record<string, string> = {
  str: '힘',
  dex: '민첩',
  wit: '재치',
  con: '체질',
  per: '통찰',
  cha: '카리스마',
};

/** 스탯별 행동 힌트 (대문자 키 — UI 표시용) */
export const STAT_ACTION_HINTS: Record<string, string> = {
  STR: '전투, 협박 판정에 사용',
  DEX: '은밀, 절도, 관찰 판정에 사용',
  WIT: '조사, 수색 판정에 사용',
  CON: '방어, 저항, 도움 판정에 사용',
  PER: '관찰, 발견 판정에 사용',
  CHA: '설득, 뇌물, 거래 판정에 사용',
};

/** 스탯별 색상 (대문자 키) */
export const STAT_COLORS: Record<string, string> = {
  STR: 'var(--hp-red)',
  DEX: 'var(--gold)',
  WIT: 'var(--success-green)',
  CON: 'var(--info-blue)',
  PER: '#c084fc',
  CHA: '#f472b6',
};

/** 소문자 statKey → 대문자 라벨 */
export const STAT_KEY_TO_LABEL: Record<string, string> = {
  str: 'STR',
  dex: 'DEX',
  wit: 'WIT',
  con: 'CON',
  per: 'PER',
  cha: 'CHA',
};
