// DimTale Service Worker — 오프라인 페이지 + 에셋 캐싱
const CACHE_NAME = 'dimtale-v1';
const OFFLINE_URL = '/offline.html';

// 설치: 오프라인 페이지 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      OFFLINE_URL,
      '/icon-192.png',
      '/icon-512.png',
    ]))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 페치: 네트워크 우선, 실패 시 오프라인 페이지
self.addEventListener('fetch', (event) => {
  // API 요청은 캐싱 안 함
  if (event.request.url.includes('/v1/') || event.request.url.includes('/api/')) {
    return;
  }

  // 네비게이션 요청 (페이지 이동)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 이미지/폰트 — 캐시 우선, 네트워크 폴백
  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
});
