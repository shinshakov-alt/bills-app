// При изменении списка файлов увеличьте номер версии
const CACHE = 'scheta-v8';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];
// Внешние файлы оформления. Ответы скрипта Gmail сюда не входят и не кешируются
const STATIC_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('scheta-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Сначала сеть, чтобы получать обновления; без сети берём копию из кеша
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const own = url.origin === self.location.origin && url.href.startsWith(self.registration.scope);
  if (!own && !STATIC_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request, { ignoreSearch: own });
        if (cached) return cached;
        if (request.mode === 'navigate') return cache.match('./index.html');
        return Response.error();
      })
  );
});
