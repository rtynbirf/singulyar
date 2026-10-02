/* СИНГУЛЯР·15 «ОРКЕСТРАТОР» — сервис-воркер для хостинга (PWA).
   Честно и минимально: cache-first для same-origin GET, офлайн-фолбэк.
   На file:// не работает (так устроены браузеры) — модулю там и не нужен:
   пак данных вшит, внешних запросов нет. */
var S15_CACHE = 's15-orkestrator-v5';
var S15_CORE = [
  './',
  './СИНГУЛЯР_15_ОРКЕСТРАТОР.html',
  './СИНГУЛЯР_17_ЗАЛ.html',
  './СИНГУЛЯР_18_СОБЫТИЕ.html',
  './СИНГУЛЯР_19_ЧЕЛОВЕК.html',
  './СИНГУЛЯР_20_ФОНЕТИКА.html',
  './БИБЛИОТЕКИ/trystero-nostr.bundle.mjs',
  './БИБЛИОТЕКИ/any-ascii.bundle.mjs'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(S15_CACHE).then(function(c){
      /* добавляем по одному: отсутствие файла не срывает установку */
      return Promise.all(S15_CORE.map(function(u){
        return c.add(new Request(u, {cache: 'reload'})).catch(function(){ return null; });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === S15_CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;      /* чужое — мимо кэша */
  /* минусовки: сеть-первая с кэш-фолбэком (файлы могут добавляться) */
  var isMinus = /\/minus\/.+\.mp3$/.test(url.pathname);
  if (isMinus){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(S15_CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req);
      })
    );
    return;
  }
  /* остальное: кэш-первая */
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(S15_CACHE).then(function(c){ c.put(req, copy); });
        return res;
      });
    })
  );
});
