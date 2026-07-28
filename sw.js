const CACHE_NAME = 'defectosng-v0.9.0';

const APP_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/tools.js',
  '/js/ringWeld.js',
  '/manifest.json',
  '/data/vik.json',
  '/data/uzk.json',
  '/data/pvk.json',
  '/data/vibration.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/images/articles/uzk/echo-pulse-principle.png',
  '/images/articles/uzk/pep-overview.png',
  '/images/articles/uzk/dac-vrc-comparison.png',
  '/images/articles/uzk/beam-input.PNG',
  '/images/articles/uzk/beam-zones.PNG',
  '/images/articles/uzk/dead-zone.PNG',
  '/images/defects/undercut.jpg',
  '/images/defects/porosity.webp',
  '/images/defects/cracks.webp',
  '/images/defects/lack-of-fusion.webp'
];

// Новая версия устанавливается в фоне, но ждёт подтверждения пользователя.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
  );
});

// После активации удаляем только старые кэши DefectoSNG.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('defectosng-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Переходим на ожидающую версию только после нажатия кнопки «Обновить».
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// При наличии интернета берём свежую версию, без интернета — кэш.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (isSameOrigin && response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy));
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);

        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        return Response.error();
      })
  );
});
