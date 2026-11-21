const V = "svyaz-x20-0.3"; /* STORE-0.1: гибрид коробки поверх волны ×20 + скриншоты сторов в SHELL. Меняешь состав коробки — подними имя, старые кэши сотрутся сами */

/* Обёртка — пути относительные: new URL(p, self.registration.scope) работает и в корне
   домена, и в подкаталоге (Pages-проект). Абсолютные «/» сломали бы скоуп — их тут нет.
   Живое (сообщения, звук, видео, конфиг) в списке не живёт — разговор всегда настоящий. */
const SHELL = [
  "index.html",
  "install.html",
  "favicon.ico", /* палата: хром-семейство сам запрашивает /favicon.ico — раньше тонил проверку 6 в 404-шум */
  "style.css",
  "app.js",
  "sloi.js",
  "azbuki.js",
  "duet.js",
  "translate.js",
  "vendor/qrcode.js",
  "manifest.webmanifest",
  "icon.svg",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon-180.png",
  "icons/favicon-64.png",
  "screenshots/link-narrow-414x896.png",
  "screenshots/link-wide-1280x800.png",
  "screenshots/link-install-narrow-414x896.png"
];
const SHELL_URLS = SHELL.map((p) => new URL(p, self.registration.scope).href);

/* Установка: каждый файл сам за себя (Promise.allSettled) — один сбойный файл
   не валит всю установку, недостающий доедет при первом удачном ответе сети.
   cache: "reload" — просим у сети свежую копию, а не из памяти браузера. */
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((box) => Promise.allSettled(
    SHELL_URLS.map((u) => box.add(new Request(u, { cache: "reload" })))
  )).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // живое не кэшируем вовсе: разговор, конфиг, здоровье, мосты — только сеть
  if (["/ws", "/config", "/health"].includes(u.pathname) || u.pathname.startsWith("/bridge")) return;
  const честно = () => new Response("Нет сети и нет сохранённой страницы — включи интернет и открой ссылку заново.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  // сеть — первой, кэш — запасной (чтобы страница открывалась и при плохой связи)
  e.respondWith((async () => {
    const box = await caches.open(V);
    // переход на страницу: сеть → кэш → обёртка index.html — ссылка-приглашение откроется даже без сети
    if (e.request.mode === "navigate") {
      try {
        const fresh = await fetch(e.request);
        if (fresh.ok) { const copy = fresh.clone(); box.put(e.request, copy); }
        return fresh;
      } catch {
        return (await box.match(e.request, { ignoreSearch: true }))
          || (await box.match(new URL("index.html", self.registration.scope).href))
          || честно();
      }
    }
    try {
      const fresh = await fetch(e.request);
      if (fresh.ok) { const copy = fresh.clone(); box.put(e.request, copy); }
      return fresh;
    } catch {
      return (await box.match(e.request, { ignoreSearch: true })) || честно();
    }
  })());
});
