// DimTale Service Worker — 오프라인 페이지 + 앱 셸 캐싱
// v3: 타이핑 리듬 개선 배포 시 구 번들 강제 무효화 (2026-04-23)
const CACHE_VERSION = 3;
const STATIC_CACHE = `dimtale-static-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `dimtale-runtime-v${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// 프리캐시 (설치 시 즉시 저장)
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// 설치: 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 활성화: 이전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 페치 전략
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 요청 — 패스스루 (캐싱 안 함)
  if (url.pathname.startsWith('/v1/') || url.pathname.startsWith('/api/')) {
    return;
  }

  // 네비게이션 (페이지 이동) — 네트워크 우선, 오프라인 폴백
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // JS/CSS 번들 (_next/static) — Stale-While-Revalidate
  // 캐시 있으면 즉시 반환 + 백그라운드에서 최신 버전 업데이트
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 이미지 — 캐시 우선 (장소 이미지, NPC 초상화 등)
  if (
    event.request.destination === 'image' ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // 폰트 — 캐시 우선 (Google Fonts 등)
  if (
    event.request.destination === 'font' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Google Fonts CSS — Stale-While-Revalidate
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 캐시 크기 관리: RUNTIME_CACHE 최대 200 항목
  caches.open(RUNTIME_CACHE).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > 200) {
        // 오래된 항목 50개 삭제
        keys.slice(0, 50).forEach((key) => cache.delete(key));
      }
    });
  });
});
