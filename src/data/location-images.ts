/**
 * (locationId, timePhase, hubSafety) → 이미지 경로 매핑
 *
 * 13개 이미지가 24개 조합(4×2×3)을 모두 커버하지 않으므로 fallback 체인:
 * 1. 정확한 키 매칭
 * 2. 같은 장소 + 시간대, safety를 SAFE로 디그레이드
 * 3. 같은 장소의 DAY_SAFE (기본값)
 */

type TimeNorm = 'DAY' | 'NIGHT';
type Safety = 'SAFE' | 'ALERT' | 'DANGER';

// locationId → choiceId prefix 변환
const LOC_PREFIX: Record<string, string> = {
  LOC_MARKET: 'market',
  LOC_GUARD: 'guard',
  LOC_HARBOR: 'harbor',
  LOC_SLUMS: 'slums',
};

// 존재하는 이미지 조합 (프롬프트 기반)
const IMAGE_MAP: Record<string, string> = {
  'market_day_safe': '/locations/market_day_safe.png',
  'market_night_safe': '/locations/market_night_safe.png',
  'market_day_danger': '/locations/market_day_danger.png',
  'guard_day_safe': '/locations/guard_day_safe.png',
  'guard_night_alert': '/locations/guard_night_alert.png',
  'guard_day_danger': '/locations/guard_day_danger.png',
  'harbor_day_safe': '/locations/harbor_day_safe.png',
  'harbor_night_alert': '/locations/harbor_night_alert.png',
  'harbor_night_danger': '/locations/harbor_night_danger.png',
  'slums_day_safe': '/locations/slums_day_safe.png',
  'slums_night_safe': '/locations/slums_night_safe.png',
  'slums_night_danger': '/locations/slums_night_danger.png',
};

const HUB_IMAGE = '/locations/graymar_overview.png';

function normalizeTime(phaseV2?: string, timePhase?: string): TimeNorm {
  if (phaseV2) {
    return phaseV2 === 'DAWN' || phaseV2 === 'DAY' ? 'DAY' : 'NIGHT';
  }
  return timePhase === 'NIGHT' ? 'NIGHT' : 'DAY';
}

export function getLocationImagePath(
  locationId: string | null | undefined,
  timePhase?: string,
  hubSafety?: string,
  phaseV2?: string,
): string {
  // HUB (locationId 없음)
  if (!locationId) return HUB_IMAGE;

  const prefix = LOC_PREFIX[locationId];
  if (!prefix) return HUB_IMAGE;

  const time = normalizeTime(phaseV2, timePhase);
  const safety = (hubSafety ?? 'SAFE') as Safety;

  // 1. 정확한 키 매칭
  const exactKey = `${prefix}_${time.toLowerCase()}_${safety.toLowerCase()}`;
  if (IMAGE_MAP[exactKey]) return IMAGE_MAP[exactKey];

  // 2. 같은 장소 + 시간대, SAFE로 디그레이드
  const safeKey = `${prefix}_${time.toLowerCase()}_safe`;
  if (IMAGE_MAP[safeKey]) return IMAGE_MAP[safeKey];

  // 3. 같은 장소의 DAY_SAFE
  const defaultKey = `${prefix}_day_safe`;
  if (IMAGE_MAP[defaultKey]) return IMAGE_MAP[defaultKey];

  return HUB_IMAGE;
}
