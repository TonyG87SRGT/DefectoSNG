const CACHE_NAME = 'defectosng-v0.10.5';

const APP_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/references.js',
  '/js/tools.js',
  '/js/ringWeld.js',
  '/manifest.json',
  '/data/vik.json',
  '/data/uzk.json',
  '/data/pvk.json',
  '/data/vibration.json',
  '/data/references.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/images/articles/uzk/echo-pulse-principle.webp',
  '/images/articles/uzk/pep-overview.webp',
  '/images/articles/uzk/dac-vrc-comparison.webp',
  '/images/articles/uzk/beam-input.webp',
  '/images/articles/uzk/beam-zones.webp',
  '/images/articles/uzk/dead-zone.webp',
  '/images/defects/undercut.jpg',
  '/images/defects/porosity.webp',
  '/images/defects/cracks.webp',
  '/images/defects/lack-of-fusion.webp',
  '/images/defects/slag-inclusions.webp',
  '/images/defects/unfilled-crater.webp',
  '/images/defects/burn-through.webp',
  '/images/defects/overlap.webp',
  '/images/defects/edge-misalignment.webp',
  '/images/defects/uneven-reinforcement.webp',
  '/images/defects/interpass-depression.webp',
  '/images/defects/metal-spatter.webp',
  '/images/defects/fistula.webp',
  '/images/atlas/cracks-photo.webp',
  '/images/atlas/cracks-scheme.webp',
  '/images/atlas/edge-misalignment-photo.webp',
  '/images/atlas/edge-misalignment-scheme.webp',
  '/images/atlas/fistula-photo.webp',
  '/images/atlas/fistula-scheme.webp',
  '/images/atlas/interpass-depression-photo.webp',
  '/images/atlas/interpass-depression-scheme.webp',
  '/images/atlas/lack-of-fusion-photo.webp',
  '/images/atlas/lack-of-fusion-scheme.webp',
  '/images/atlas/metal-spatter-photo.webp',
  '/images/atlas/metal-spatter-scheme.webp',
  '/images/atlas/porosity-photo.webp',
  '/images/atlas/porosity-scheme.webp',
  '/images/atlas/slag-inclusions-photo.webp',
  '/images/atlas/slag-inclusions-scheme.webp',
  '/images/atlas/uneven-reinforcement-photo.webp',
  '/images/atlas/uneven-reinforcement-scheme.webp',
  '/images/atlas/unfilled-crater-photo.webp',
  '/images/atlas/unfilled-crater-scheme.webp'
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
