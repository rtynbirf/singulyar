const V = "singulyar-link-8"; /* 0.8.0: слои — progressive disclosure + клавиша установки дома (sloi.js) */
const SHELL = ["/", "/app.js", "/azbuki.js", "/translate.js", "/duet.js", "/sloi.js", "/style.css", "/manifest.webmanifest", "/icon.svg", "/vendor/qrcode.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (["/ws", "/config", "/health"].includes(u.pathname) || u.pathname.startsWith("/bridge")) return;
  // сеть — первой, кэш — запасной (чтобы страница открывалась и при плохой связи)
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
