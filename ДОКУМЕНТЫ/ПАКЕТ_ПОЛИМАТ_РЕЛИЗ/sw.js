const CACHE_NAME = 'singulyar-pwa-v2026';
const ASSETS = [
  './',
  './singulyar_pwa_visualizer.html',
  './singulyar_omnibus_core_v2026.js',
  './manifest.json',
  './hidden_order_attractor.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
