/* КВАРТИРНИК · sw.js · v10.0 «ОДИН ДОМ»
   Комната дома СИНГУЛЯР: свой кэш вечера, скоуп /КВАРТИРНИК/.
   Корневой воркер дома sw15.js (S15_CACHE) не задет: у комнаты свой
   воркер и своё поколение кэша. Файл комнаты самодостаточен (аудио
   внутри), воркер делает его доступным без сети (коттедж, дача, лифт).
   Стратегия: страница комнаты — stale-while-revalidate (вечер стартует
   мгновенно, свежая версия доезжает при следующем открытии); прочие
   GET-запросы комнаты — cache-first с сетевым обновлением.
   Имя кэша меняется с версией комнаты, старые кэши стираются при активации. */
const APP_URL = new URL("./КВАРТИРНИК.html", self.location.href);
const CACHE   = "kvartirnik-v1010";
const CORE    = [APP_URL.href];

const isAppHtml = (url) => {
  if (url.href === APP_URL.href) return true;
  try { return /\/КВАРТИРНИК\.html$/i.test(decodeURIComponent(url.pathname)); }
  catch (_) { return false; }
};

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; /* чужое не перехватываем */
  if (isAppHtml(url)) {
    /* подаём мгновенно из кеша и в фоне тянем свежую версию */
    e.respondWith(
      caches.match(APP_URL.href).then((hit) => {
        const refresh = fetch(APP_URL.href).then((res) => {
          try{
            if (res.ok) caches.open(CACHE).then((c) => c.put(APP_URL.href, res.clone()));
          }catch(err){}
          return res;
        }).catch(() => hit);
        return hit || refresh;
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        try{
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        }catch(err){}
        return res;
      }).catch(() => caches.match(APP_URL.href));
    })
  );
});
