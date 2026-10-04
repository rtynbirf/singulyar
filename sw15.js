/* СИНГУЛЯР·15 «ОРКЕСТРАТОР» — сервис-воркер для хостинга (PWA).
   Честно и минимально: cache-first для same-origin GET, офлайн-фолбэк,
   навигации без кеша отвечаем оболочкой index.html.
   На file:// не работает (так устроены браузеры) — модулю там и не нужен:
   пак данных вшит, внешних запросов нет. */
var S15_CACHE = 's15-orkestrator-v30';
var S15_CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './singulyar-ux-engine-v8.js',
  './БИБЛИОТЕКИ/adapter-os/src/core.mjs',
  './БИБЛИОТЕКИ/adapter-os/src/store.mjs',
  './БИБЛИОТЕКИ/adapter-os/adapters/basic.mjs',
  './БИБЛИОТЕКИ/adapter-os/adapters/contracts.mjs',
  './БИБЛИОТЕКИ/adapter-os/bridge.mjs',
  './БИБЛИОТЕКИ/adapter-os/llm.mjs',
  './БИБЛИОТЕКИ/wllama/index.js',
  './БИБЛИОТЕКИ/wllama/wasm/wllama.wasm',
  './СИНГУЛЯР_15_ОРКЕСТРАТОР.html',
  './СИНГУЛЯР_17_ЗАЛ.html',
  './СИНГУЛЯР_18_СОБЫТИЕ.html',
  './СИНГУЛЯР_19_ЧЕЛОВЕК.html',
  './СИНГУЛЯР_20_ФОНЕТИКА.html',
  './СИНГУЛЯР_21_ОБЩЕНИЕ.html',
  './СИНГУЛЯР_22_СВЯЗЬ.html',
  './СИНГУЛЯР_23_КРУГ.html',
  './СИНГУЛЯР_24_ПОЧТА.html',
  './СИНГУЛЯР_25_КОШЕЛЁК.html',
  './СИНГУЛЯР_26_ЛИНИЯ.html',
  './ДОКУМЕНТЫ/ПОДДЕРЖАТЬ.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './ИНСТРУКЦИЯ_УСТАНОВКИ.md',
  './БИБЛИОТЕКИ/trystero-nostr.bundle.mjs',
  './БИБЛИОТЕКИ/any-ascii.bundle.mjs',
  './БИБЛИОТЕКИ/кристалл/crystal-core.mjs',
  './БИБЛИОТЕКИ/кристалл/bridges.mjs',
  './БИБЛИОТЕКИ/кристалл/крипта.mjs',
  './БИБЛИОТЕКИ/кристалл/journal.mjs',
  './БИБЛИОТЕКИ/кристалл/semantic-event.schema.json'
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
  /* навигация по страницам: сеть-первая, офлайн — оболочка */
  if (req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(S15_CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('./index.html');
        });
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
