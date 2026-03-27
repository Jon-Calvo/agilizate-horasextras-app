const CACHE_NAME = 'agilizate-v1';
const urlsToCache = [
  '/',
  '/css/main.css',
  '/js/config.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
