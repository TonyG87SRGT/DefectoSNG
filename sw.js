const CACHE_NAME = 'defectosng-v0.4.1';

const APP_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/data/vik.json',
  '/data/uzk.json',
  '/data/pvk.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/images/articles/uzk/echo-pulse-principle.png'
];

// Установка новой версии и предварительное кэширование
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});

// Активация новой версии и удаление старых кэшей DefectoSNG
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith('defectosng-') &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// При наличии интернета берём свежую версию.
// Без интернета используем сохранённую копию.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy));
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);

        if (cached) {
          return cached;
        }

        // Если пользователь открыл страницу офлайн,
        // которой нет в кэше, показываем главное приложение.
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        return Response.error();
      })
  );
});
