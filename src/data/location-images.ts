/**
 * (locationId, timePhase, hubSafety) → 이미지 경로 매핑
 *
 * architecture/63 ⑥ — 시나리오 팩 인지 구조:
 * - locationId 접두로 팩을 판별한다 (LOC_SD_* = silverdeen_v1, 그 외 LOC_* = graymar_v1).
 * - 이미지가 없는 팩(silverdeen 등)은 null을 반환하고 호출자가 이미지를 생략한다
 *   (graymar 전경으로 fallback하면 세계관 오염).
 * - 신규 팩 에셋 경로 규약: /locations/<packId>/... (graymar는 레거시 플랫 경로 유지).
 *
 * graymar 이미지는 13개가 24개 조합(4×2×3)을 모두 커버하지 않으므로 fallback 체인:
 * 1. 정확한 키 매칭 → 2. 같은 장소 + 시간대, SAFE 디그레이드 → 3. 같은 장소의 DAY_SAFE
 */

type TimeNorm = 'DAY' | 'NIGHT';
type Safety = 'SAFE' | 'ALERT' | 'DANGER';

interface PackImages {
  /** locationId → 이미지 키 프리픽스 */
  locPrefix: Record<string, string>;
  imageMap: Record<string, string>;
  /** HUB(장소 미지정) 전경 — 없으면 null 반환 */
  hubImage: string | null;
}

const GRAYMAR_IMAGES: PackImages = {
  locPrefix: {
    LOC_MARKET: 'market',
    LOC_GUARD: 'guard',
    LOC_HARBOR: 'harbor',
    LOC_SLUMS: 'slums',
    LOC_TAVERN: 'tavern',
  },
  imageMap: {
    // Market (시장)
    market_day_safe: '/locations/market_day_safe.webp',
    market_day_alert: '/locations/market_day_alert.webp',
    market_day_danger: '/locations/market_day_danger.webp',
    market_night_safe: '/locations/market_night_safe.webp',
    market_night_alert: '/locations/market_night_alert.webp',
    market_night_danger: '/locations/market_night_danger.webp',
    // Guard (경비대)
    guard_day_safe: '/locations/guard_day_safe.webp',
    guard_day_alert: '/locations/guard_day_alert.webp',
    guard_day_danger: '/locations/guard_day_danger.webp',
    guard_night_safe: '/locations/guard_night_safe.webp',
    guard_night_alert: '/locations/guard_night_alert.webp',
    guard_night_danger: '/locations/guard_night_danger.webp',
    // Harbor (항구)
    harbor_day_safe: '/locations/harbor_day_safe.webp',
    harbor_day_alert: '/locations/harbor_day_alert.webp',
    harbor_day_danger: '/locations/harbor_day_danger.webp',
    harbor_night_safe: '/locations/harbor_night_safe.webp',
    harbor_night_alert: '/locations/harbor_night_alert.webp',
    harbor_night_danger: '/locations/harbor_night_danger.webp',
    // Slums (빈민가)
    slums_day_safe: '/locations/slums_day_safe.webp',
    slums_day_alert: '/locations/slums_day_alert.webp',
    slums_day_danger: '/locations/slums_day_danger.webp',
    slums_night_safe: '/locations/slums_night_safe.webp',
    slums_night_alert: '/locations/slums_night_alert.webp',
    slums_night_danger: '/locations/slums_night_danger.webp',
    // Tavern (잠긴 닻 선술집) — 프롤로그 전용, day/night 2종만 보유
    tavern_day_safe: '/locations/tavern_day_safe.webp',
    tavern_night_safe: '/locations/tavern_night_safe.webp',
  },
  hubImage: '/locations/graymar_overview.webp',
};

/** silverdeen_v1 — 전용 에셋 미제작 (architecture/63 ⑥ 후속). 이미지 없이 진행. */
const SILVERDEEN_IMAGES: PackImages = {
  locPrefix: {},
  imageMap: {},
  hubImage: null,
};

/** locationId 접두 → 팩 이미지 셋 판별 */
function packFor(locationId: string | null | undefined): PackImages {
  if (locationId && locationId.startsWith('LOC_SD_')) return SILVERDEEN_IMAGES;
  return GRAYMAR_IMAGES;
}

function normalizeTime(phaseV2?: string, timePhase?: string): TimeNorm {
  if (phaseV2) {
    return phaseV2 === 'DAWN' || phaseV2 === 'DAY' ? 'DAY' : 'NIGHT';
  }
  return timePhase === 'NIGHT' ? 'NIGHT' : 'DAY';
}

/** 이미지가 없으면 null — 호출자는 이미지를 생략한다. */
export function getLocationImagePath(
  locationId: string | null | undefined,
  timePhase?: string,
  hubSafety?: string,
  phaseV2?: string,
): string | null {
  const pack = packFor(locationId);

  // HUB (locationId 없음)
  if (!locationId) return pack.hubImage;

  const prefix = pack.locPrefix[locationId];
  if (!prefix) return pack.hubImage;

  const time = normalizeTime(phaseV2, timePhase);
  const safety = (hubSafety ?? 'SAFE') as Safety;

  // 1. 정확한 키 매칭
  const exactKey = `${prefix}_${time.toLowerCase()}_${safety.toLowerCase()}`;
  if (pack.imageMap[exactKey]) return pack.imageMap[exactKey];

  // 2. 같은 장소 + 시간대, SAFE로 디그레이드
  const safeKey = `${prefix}_${time.toLowerCase()}_safe`;
  if (pack.imageMap[safeKey]) return pack.imageMap[safeKey];

  // 3. 같은 장소의 DAY_SAFE
  const defaultKey = `${prefix}_day_safe`;
  if (pack.imageMap[defaultKey]) return pack.imageMap[defaultKey];

  return pack.hubImage;
}

/** 시나리오 선택 카드 배너 — 팩 대표 이미지 (없으면 null, 카드는 그라데이션 fallback) */
const SCENARIO_BANNERS: Record<string, string | null> = {
  graymar_v1: '/locations/graymar_overview.webp',
  silverdeen_v1: null,
};

export function getScenarioBannerImage(scenarioId: string): string | null {
  return SCENARIO_BANNERS[scenarioId] ?? null;
}
