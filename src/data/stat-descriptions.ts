/** 스탯 한국어 이름 (소문자 키) */
export const STAT_KOREAN_NAMES: Record<string, string> = {
  atk: '공격력',
  def: '방어력',
  acc: '명중',
  eva: '회피',
  speed: '속도',
};

/** 스탯별 행동 힌트 (대문자 키 — UI 표시용) */
export const STAT_ACTION_HINTS: Record<string, string> = {
  ATK: '전투, 위협 판정에 사용',
  DEF: '지원, 보호 판정에 사용',
  ACC: '조사, 탐색 판정에 사용',
  EVA: '은밀, 관찰, 절도 판정에 사용',
  SPEED: '설득, 매수, 거래 판정에 사용',
  CRIT: '전투 치명타 확률에 영향',
  RESIST: '상태이상 저항에 영향',
};

/** 스탯별 색상 (대문자 키) */
export const STAT_COLORS: Record<string, string> = {
  ATK: 'var(--hp-red)',
  DEF: 'var(--info-blue)',
  ACC: 'var(--success-green)',
  EVA: 'var(--gold)',
  CRIT: 'var(--hp-red)',
  SPEED: 'var(--success-green)',
  RESIST: 'var(--info-blue)',
};

/** 소문자 statKey → 대문자 라벨 */
export const STAT_KEY_TO_LABEL: Record<string, string> = {
  atk: 'ATK',
  def: 'DEF',
  acc: 'ACC',
  eva: 'EVA',
  speed: 'SPEED',
};
