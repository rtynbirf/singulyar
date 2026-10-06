/* СИНГУЛЯР·15 «ОРКЕСТРАТОР» — сервис-воркер для хостинга (PWA).
   Честно и минимально: cache-first для same-origin GET, офлайн-фолбэк,
   навигации без кэша отвечаем оболочкой index.html.
   На file:// не работает (так устроены браузеры) — модулю там и не нужен:
   пак данных вшит, внешних запросов нет.
   Такт v1.36.1 «ЖИВОЙ КРИСТАЛЛ»: кэш v46 — шар рассыпается на осколки,
   двери дома встают на орбиты (клик по кристаллу на лице).
   Такт v1.37.0 «СВОД»: кэш v47 — свод законов дома (I-01..I-10),
   композиция v0.1, черновик space-схемы, репарация дрейфа каталога.
   Такт v1.38.0 «СВОБОДА»: кэш v48 — дверь ·29 (UI над композицией),
   View Transitions в мосту; СВОД-доки и движок композиции встают в пре-кэш
   (офлайн-закон: открытые доки дома обязаны жить без сети).
   Такт v1.39.0 «ЖИВАЯ НИТЬ»: кэш v49 — связи дверей в манифесте, нить
   между осколками (SVG), память пути (визиты, append-only); док такта
   «ЖИВАЯ_НИТЬ.md» в пре-кэше.
   Такт v1.40.0 «РЕВИЗИЯ»: кэш v50 — сервер без внешних зависимостей
   (WebSocket RFC 6455 своими руками, s19-тесты живы у каждого),
   РУМА-1 выкурена: ноль живых innerHTML, глиф ◈/◇ честный;
   док ревизии «РЕВИЗИЯ_РУМ.md» в пре-кэше.
   Такт v1.41.0 «ТКАНЬ»: кэш v51 — дверь ·30 и ядро P2P Human Information
   Fabric (БИБЛИОТЕКИ/ткань/, 0 зависимостей) в пре-кэше; Атари-пиктограммы
   (эмодзи) выкурены по всему живому UI дома — глифы канона и слова.
   Такт v1.42.0 «ЗАКАЛКА» (приказ владельца: «ИСПРАВЛЯЙ КОСЯЧКИ БАГИ ПРИБИВАЙ,
   ЧТОБ У ЧЕЛОВЕКА НЕ ВЫЛЕЗ СИНИЙ (СЕЙЧАС ЧЁРНЫЙ =)) ЭКРАН СМЕРТИ И УСТРОЙСТВО
   НЕ СТАЛО КИРПИЧЁМ»): кэш v52 — ПРИБИТО:
   · потолок кэша S15_MAX=140: раньше каждый GET навсегда ложился в кэш
     (минусовки и всё подряд) — телефон забивался до квоты, дом превращался
     в кирпич; теперь старейшие записи вытесняются, квоте некуда расти;
   · каждый put — в catch: квота/приватный режим не роняют воркер;
   · навигация без сети И без кэша (первый заход офлайн) отвечает честной
     офлайн-оболочкой в каноне, а не пустотой браузера;
   · нехватка ресурса (не-навигация) — честный 504, не подвешенный запрос;
   · страховочный КОРД вшит в каждую страницу дома (error/unhandledrejection
     → стекло+золото панель, журнал, тихий режим) — чёрный экран смерти снят
     на уровне страниц, воркер доставляет страницы, а не тишину.
   Такт v1.43.0 «СТАЛЬ» (приказ владельца: «ТЫ САМ ВСЁ ЗНАЕШЬ — КОСЯЧКИ
   БАГИ ПРИБИВАЙ»): кэш v53 — ПРИБИТО:
   · ЯДРО ОФЛАЙНА НЕПРИКАСАЕМО: вытеснение при потолке раньше брало ключи
     по порядку вставки, а ядро вставлено первым — вылетало ПЕРВЫМ (хаб
     слеп офлайн у походившего по комнатам). Теперь выгоняем посещённое,
     ядро — последнее; выселение ждём ДО put (место к моменту записи
     освобождено, промис не висит без waitUntil);
   · нити ·30 ТКАНЬ симметричны в манифесте (обратки s19/s21/s22),
     ядро v1.8.0; ДОКУМЕНТЫ/СТАЛЬ_НИТИ_И_ЯДРО.md в пре-кэше.
   Такт v1.45.0 «ХОЗЯИН» (приказ владельца: «ИДИ ВЕЗДЕ ДОДЕЛАЙ ВСЕ МЕЛОЧИ
   ХОЗЯЙСКИМ ВЗГЛЯДОМ»): кэш v55 — ПРИБИТО:
   · ПУЛЬТ ХОЗЯИНА на лице дома: клавиши ПЛЕЙ/ПАУЗА/СТОП/РЕПИТ/СЛУЧАЙНО
     над шаром — играет локальный фонд minus/ (62 минусовки), ноль сети;
   · СКВОЗНАЯ НАВИГАЦИЯ в бирке каждой комнаты: хаб · соседние двери · нить;
   · СПРАВКИ ВЕЗДЕ v9.5: при наведении — настоящая справка, не эхо ярлыка;
   · уборка: YouTube-хвосты выкурены из названий песен (·01, ·18, каталог). */
var S15_CACHE = 's15-orkestrator-v55';
var S15_MAX = 140;   /* честный потолок кэша (ЗАКАЛКА): выше — вытесняем старейшие */
var S15_CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './singulyar-ux-engine-v9.js',
  './singulyar-modules.js',
  './singulyar-design-v3.css',
  './СИНГУЛЯР_27_ФУНДАМЕНТ.html',
  './СИНГУЛЯР_28_УЗЕЛ.html',
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
  './СИНГУЛЯР_29_СВОБОДА.html',
  './СИНГУЛЯР_30_ТКАНЬ.html',
  './СИНГУЛЯР_31_КВАРТИРНИК.html',
  './ДОКУМЕНТЫ/ПОДДЕРЖАТЬ.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './ИНСТРУКЦИЯ_УСТАНОВКИ.html',
  './ИНСТРУКЦИЯ_ДОМА.html',
  './ДОКУМЕНТАЦИЯ.html',
  './ПРОТОКОЛ_ВЫВОДА_НА_ЭКРАН.html',
  './ПРОТОКОЛ_ВЫВОДА_НА_ЭКРАН.md',
  './ИНСТРУКЦИЯ_СТАРТ.md',
  './README.md',
  './ФУНДАМЕНТ/01_title.webp',
  './ФУНДАМЕНТ/02_past_vs_future.webp',
  './ФУНДАМЕНТ/03_architecture_table.webp',
  './ФУНДАМЕНТ/04_six_facets_crystal.webp',
  './ФУНДАМЕНТ/05_atlas_flow.webp',
  './ФУНДАМЕНТ/06_resonance.webp',
  './ФУНДАМЕНТ/07_aura.webp',
  './ФУНДАМЕНТ/08_local_brain.webp',
  './ФУНДАМЕНТ/09_mesh.webp',
  './ФУНДАМЕНТ/10_vault.webp',
  './ФУНДАМЕНТ/11_ui_ux_spatial.webp',
  './ФУНДАМЕНТ/12_economy_life.webp',
  './ФУНДАМЕНТ/13_one_file.webp',
  './ФУНДАМЕНТ/14_synthesis.webp',
  './ФУНДАМЕНТ/15_final.webp',

  './БИБЛИОТЕКИ/trystero-nostr.bundle.mjs',
  './БИБЛИОТЕКИ/any-ascii.bundle.mjs',
  './БИБЛИОТЕКИ/кристалл/crystal-core.mjs',
  './БИБЛИОТЕКИ/кристалл/bridges.mjs',
  './БИБЛИОТЕКИ/кристалл/крипта.mjs',
  './БИБЛИОТЕКИ/кристалл/journal.mjs',
  './БИБЛИОТЕКИ/кристалл/semantic-event.schema.json',
  './БИБЛИОТЕКИ/кристалл/composition.mjs',
  './БИБЛИОТЕКИ/ткань/ткань.mjs',
  './БИБЛИОТЕКИ/ткань/протокол.mjs',
  './БИБЛИОТЕКИ/ткань/целостность.mjs',
  './БИБЛИОТЕКИ/ткань/манифест.mjs',
  './БИБЛИОТЕКИ/ткань/отношения.mjs',
  './БИБЛИОТЕКИ/ткань/представления.mjs',
  './БИБЛИОТЕКИ/ткань/транспорт.mjs',
  './БИБЛИОТЕКИ/ткань/README.md',
  './ДОКУМЕНТЫ/ТКАНЬ_СВОЙ_ПУТЬ.md',
  './БИБЛИОТЕКИ/кристалл/space.schema.json',
  './ДОКУМЕНТЫ/СВОД_ЗАКОНОВ.md',
  './ДОКУМЕНТЫ/СВОД_ЗАКОНОВ.json',
  './ДОКУМЕНТЫ/СИНТЕЗ_HUMAN_RUNTIME_v2.md',
  './ДОКУМЕНТЫ/ЖИВАЯ_НИТЬ.md',
  './ДОКУМЕНТЫ/РЕВИЗИЯ_РУМ.md',
  './ДОКУМЕНТЫ/СТАЛЬ_НИТИ_И_ЯДРО.md'
];

/* положиВКэш: put с потолком и честной тишиной при квоте (ЗАКАЛКА).
   Тело ответа передаётся уже клонированной копией — оригинал едет странице.
   ЗАКАЛКА v1.43.0 (кирпичу нет — вторая доска):
   · ЯДРО ОФЛАЙНА НЕПРИКАСАЕМО: раньше вытеснение брало КЛЮЧИ ПО ПОРЯДКУ ВСТАВКИ,
     а ядро вставлено первым на install — значит, вылетало ПЕРВЫМ. Дом,
     походивший по комнатам, терял index.html и движки офлайн — PWA слепла.
     Теперь выгоняем сначала посещённое (не-ядро), и только если потолок
     всё равно превышен (не должно: 140 > ядра) — старейшие из ядра.
   · выселение ДО put (await), а не пожарным порядком: к моменту записи
     место уже освобождено, и висящего без waitUntil промиса нет. */
var S15_CORE_SET = (function () {
  try {
    var s = new Set();
    S15_CORE.forEach(function (u) { s.add(new URL(u, self.location.href).href); });
    return s;
  } catch (е) { return new Set(); }
})();

function положиВКэш(req, copy) {
  return caches.open(S15_CACHE).then(function (c) {
    return c.keys().then(function (ключи) {
      var выгоняем = [];
      if (ключи.length >= S15_MAX) {
        var лишних = ключи.length - S15_MAX;
        var чужие = ключи.filter(function (к) { return !S15_CORE_SET.has(к.url); });
        выгоняем = чужие.slice(0, лишних);
        if (выгоняем.length < лишних) {
          выгоняем = выгоняем.concat(ключи.filter(function (к) {
            return S15_CORE_SET.has(к.url);
          }).slice(0, лишних - выгоняем.length));
        }
      }
      return Promise.all(выгоняем.map(function (ст) { return c.delete(ст).catch(function () { }); }));
    }).then(function () {
      return c.put(req, copy).catch(function () { /* квота — сеть всё равно жива */ });
    });
  }).catch(function () { });
}

/* офлайн-оболочка (ЗАКАЛКА): первый заход без сети больше не показывает
   пустоту браузера — честная страница в каноне дома. */
function оболочка() {
  return new Response(
    '<!doctype html><html lang="ru"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>СИНГУЛЯР — офлайн</title>' +
    '<style>body{background:#0A0A0C;color:#C0C8D0;font:16px/1.6 system-ui,-apple-system,sans-serif;' +
    'display:grid;place-items:center;min-height:100svh;margin:0;text-align:center;padding:20px}a{color:#D4AF37}</style>' +
    '<main><p style="color:#F0D78C;font:12px/1 ui-monospace,monospace;letter-spacing:.3em">◇ СИНГУЛЯР · ОФЛАЙН</p>' +
    '<p style="margin:14px 0 6px">Сеть не дошла, а этой страницы ещё нет в кэше дома.</p>' +
    '<p style="color:#8A9099;font-size:14px">Дом уже в кэше: <a href="./">открыть главную</a>.</p></main>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(S15_CACHE).then(function (c) {
      /* добавляем по одному: отсутствие файла не срывает установку */
      return Promise.all(S15_CORE.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === S15_CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;      /* чужое — мимо кэша */
  /* минусовки: сеть-первая с кэш-фолбэком (файлы могут добавляться) */
  var isMinus = /\/minus\/.+\.mp3$/.test(url.pathname);
  if (isMinus) {
    e.respondWith(
      fetch(req).then(function (res) {
        положиВКэш(req, res.clone());
        return res;
      }).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }
  /* навигация по страницам: сеть-первая, офлайн — кэш, дальше — оболочка */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        положиВКэш(req, res.clone());
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          return caches.match('./index.html').then(function (дом) {
            return дом || оболочка();
          });
        }).catch(function () { return оболочка(); });
      })
    );
    return;
  }
  /* остальное: кэш-первая, мимо кэша — сеть, без сети — честный 504 */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        положиВКэш(req, res.clone());
        return res;
      }).catch(function () {
        return new Response('СИНГУЛЯР: офлайн, этого файла нет в кэше дома',
          { status: 504, statusText: 'SNG offline', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      });
    })
  );
});
