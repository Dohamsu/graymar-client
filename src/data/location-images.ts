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

// 전체 24 조합 이미지 (4장소 × 2시간 × 3안전도)
const IMAGE_MAP: Record<string, string> = {
  // Market (시장)
  'market_day_safe': '/locations/market_day_safe.webp',
  'market_day_alert': '/locations/market_day_alert.webp',
  'market_day_danger': '/locations/market_day_danger.webp',
  'market_night_safe': '/locations/market_night_safe.webp',
  'market_night_alert': '/locations/market_night_alert.webp',
  'market_night_danger': '/locations/market_night_danger.webp',
  // Guard (경비대)
  'guard_day_safe': '/locations/guard_day_safe.webp',
  'guard_day_alert': '/locations/guard_day_alert.webp',
  'guard_day_danger': '/locations/guard_day_danger.webp',
  'guard_night_safe': '/locations/guard_night_safe.webp',
  'guard_night_alert': '/locations/guard_night_alert.webp',
  'guard_night_danger': '/locations/guard_night_danger.webp',
  // Harbor (항구)
  'harbor_day_safe': '/locations/harbor_day_safe.webp',
  'harbor_day_alert': '/locations/harbor_day_alert.webp',
  'harbor_day_danger': '/locations/harbor_day_danger.webp',
  'harbor_night_safe': '/locations/harbor_night_safe.webp',
  'harbor_night_alert': '/locations/harbor_night_alert.webp',
  'harbor_night_danger': '/locations/harbor_night_danger.webp',
  // Slums (빈민가)
  'slums_day_safe': '/locations/slums_day_safe.webp',
  'slums_day_alert': '/locations/slums_day_alert.webp',
  'slums_day_danger': '/locations/slums_day_danger.webp',
  'slums_night_safe': '/locations/slums_night_safe.webp',
  'slums_night_alert': '/locations/slums_night_alert.webp',
  'slums_night_danger': '/locations/slums_night_danger.webp',
};

const HUB_IMAGE = '/locations/graymar_overview.webp';

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
