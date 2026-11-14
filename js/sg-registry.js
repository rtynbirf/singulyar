/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · РЕЕСТР ВЕРСИЙ — общий мини-скрипт всех дверей дома; с такта v11.25 «САЖЕНЦЫ» (С103) — пути-кандидаты: правда находится из любой глубины подпапок
   Единый источник правды: data/versions.json (схема 1).

   Три независимых действия — падение одного не роняет остальные:
     1) fetch реестра → window.SG_РЕЕСТР + событие «sg-реестр-готов»
     2) авто-заполнение [data-реестр] («дверей», «песен», «языков»,
        «версия», «такт», «кэш», «воркер»)
     3) регистрация сервис-воркера sw15.js (только http/https)

   Закон дома: ES2019 (Chromium 76), innerHTML запрещён — только
   textContent; ни одного действия без try/catch; скрипт не имеет
   права ломать комнату, в которую вшит.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1. Реестр: fetch → window.SG_РЕЕСТР → событие ─────────────── */
  /* ЛАТКА ДИСЛОКАЦИЯ 2026-11-11: правду перечитываем каждые 5 минут
     (режим реального времени) и ломаем CDN-кэш (?t= — грабля ЛЕТОПИСЦА
     6bdb0cd: raw/CDN отдаёт устаревшее). Падение одного чтения не роняет
     остальные; свежая правда перерисовывает бирки сама. */
  (function загрузитьРеестр() {
    try {
      if (typeof fetch !== 'function') return;
      /* такт v11.25 «САЖЕНЦЫ» (С103): дом живёт на любой глубине —
         дверь в подпапке ищет правду вверх по лестнице (их канон не тронут) */
      var КАНДИДАТЫ = ['data/versions.json', '../data/versions.json', '../../data/versions.json', '../../../data/versions.json'];
      var ДИСЛОКАЦИЯ = ['data/дислокация.json', '../data/дислокация.json', '../../data/дислокация.json', '../../../data/дислокация.json'];
      /* W3 «ВНЕШНИЕ ДЕЙСТВИЯ» (F-011): живой реестр статусов внешних действий —
         тот же закон «правда перечитывается»: 5 минут, cache-buster, кандидаты вверх */
      var СТАТУСЫ = ['data/статусы.json', '../data/статусы.json', '../../data/статусы.json', '../../../data/статусы.json'];
      /* W4 «КОНТРАКТЫ + КАРТА МИРОВ» (ТЗ §4): живые реестры контрактов V1 и миров
         дома (F-023) — тот же закон «правда перечитывается»: 5 минут, cache-buster,
         кандидаты вверх; падение одного чтения не роняет остальные */
      var КОНТРАКТЫ = ['data/контракты.json', '../data/контракты.json', '../../data/контракты.json', '../../../data/контракты.json'];
      var МИРЫ = ['data/миры.json', '../data/миры.json', '../../data/миры.json', '../../../data/миры.json'];
      /* W5 «AT-МАТРИЦА» (ТЗ §5): живой реестр доступности — тот же закон
         «правда перечитывается»: 5 минут, cache-buster, кандидаты вверх */
      var АТ_МАТРИЦА = ['data/at-матрица.json', '../data/at-матрица.json', '../../data/at-матрица.json', '../../../data/at-матрица.json'];
      function чтоЕсть(список, i) { return i >= список.length ? null : список[i]; }
      function попыткаРеестра() {
        function попытка(i) {
          var путь = чтоЕсть(КАНДИДАТЫ, i);
          if (!путь) return; /* офлайн/file:// — комнаты живут без реестра */
          fetch(путь + '?t=' + Date.now())
            .then(function (ответ) {
              if (!ответ.ok) throw new Error('реестр: HTTP ' + ответ.status);
              return ответ.json();
            })
            .then(function (json) {
              try {
                window.SG_РЕЕСТР = json;
                if (typeof CustomEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('sg-реестр-готов', { detail: json }));
                }
                заполнитьДатаРеестр(json); /* 2. после прихода правды — заполнить */
              } catch (е) { /* реестр не имеет права ломать комнату */ }
            })
            .catch(function () { попытка(i + 1); /* не здесь — ищем выше */ });
        }
        попытка(0);
      }
      function попыткаДислокации() {
        function попытка(i) {
          var путь = чтоЕсть(ДИСЛОКАЦИЯ, i);
          if (!путь) return; /* замера ещё нет — страницы живут без строки */
          fetch(путь + '?t=' + Date.now())
            .then(function (ответ) {
              if (!ответ.ok) throw new Error('дислокация: HTTP ' + ответ.status);
              return ответ.json();
            })
            .then(function (json) {
              try {
                window.SG_ДИСЛОКАЦИЯ = json;
                if (typeof CustomEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('sg-дислокация-готов', { detail: json }));
                }
              } catch (е) { /* строка не обязана жить */ }
            })
            .catch(function () { попытка(i + 1); });
        }
        попытка(0);
      }
      /* W3: статусы внешних действий → window.SG_СТАТУСЫ → событие */
      function попыткаСтатусов() {
        function попытка(i) {
          var путь = чтоЕсть(СТАТУСЫ, i);
          if (!путь) return; /* реестра статусов ещё нет — панели живут честным «не готово» */
          fetch(путь + '?t=' + Date.now())
            .then(function (ответ) {
              if (!ответ.ok) throw new Error('статусы: HTTP ' + ответ.status);
              return ответ.json();
            })
            .then(function (json) {
              try {
                window.SG_СТАТУСЫ = json;
                if (typeof CustomEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('sg-статусы-готов', { detail: json }));
                }
              } catch (е) { /* панель не обязана жить */ }
            })
            .catch(function () { попытка(i + 1); });
        }
        попытка(0);
      }
      /* W4: контракты V1 → window.SG_КОНТРАКТЫ → событие */
      function попыткаКонтрактов() {
        function попытка(i) {
          var путь = чтоЕсть(КОНТРАКТЫ, i);
          if (!путь) return; /* реестра ещё нет — лица живут честным «не готово» */
          fetch(путь + '?t=' + Date.now())
            .then(function (ответ) {
              if (!ответ.ok) throw new Error('контракты: HTTP ' + ответ.status);
              return ответ.json();
            })
            .then(function (json) {
              try {
                window.SG_КОНТРАКТЫ = json;
                if (typeof CustomEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('sg-контракты-готов', { detail: json }));
                }
              } catch (е) { /* панель не обязана жить */ }
            })
            .catch(function () { попытка(i + 1); });
        }
        попытка(0);
      }
      /* W4: миры дома → window.SG_МИРЫ → событие */
      function попыткаМиров() {
        function попытка(i) {
          var путь = чтоЕсть(МИРЫ, i);
          if (!путь) return; /* реестра ещё нет — паспорт живёт честным «замер идёт» */
          fetch(путь + '?t=' + Date.now())
            .then(function (ответ) {
              if (!ответ.ok) throw new Error('миры: HTTP ' + ответ.status);
              return ответ.json();
            })
            .then(function (json) {
              try {
                window.SG_МИРЫ = json;
                if (typeof CustomEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('sg-миров-готов', { detail: json }));
                }
              } catch (е) { /* панель не обязана жить */ }
            })
            .catch(function () { попытка(i + 1); });
        }
        попытка(0);
      }
      /* W5: AT-матрица → window.SG_АТ → событие */
      function попыткаАТ() {
        function попытка(i) {
          var путь = чтоЕсть(АТ_МАТРИЦА, i);
          if (!путь) return; /* реестра ещё нет — панель живёт честным «замер идёт» */
          fetch(путь + '?t=' + Date.now())
            .then(function (ответ) {
              if (!ответ.ok) throw new Error('at-матрица: HTTP ' + ответ.status);
              return ответ.json();
            })
            .then(function (json) {
              try {
                window.SG_АТ = json;
                if (typeof CustomEvent === 'function') {
                  window.dispatchEvent(new CustomEvent('sg-ат-готов', { detail: json }));
                }
              } catch (е) { /* панель не обязана жить */ }
            })
            .catch(function () { попытка(i + 1); });
        }
        попытка(0);
      }
      попыткаРеестра();
      попыткаДислокации();
      попыткаСтатусов();
      попыткаКонтрактов();
      попыткаМиров();
      попыткаАТ();
      /* реальное время: 5 минут — и правда дома перечитана сама */
      try { setInterval(function () { попыткаРеестра(); попыткаДислокации(); попыткаСтатусов(); попыткаКонтрактов(); попыткаМиров(); попыткаАТ(); }, 300000); } catch (е) { /* нет таймеров — живём разовым чтением */ }
    } catch (е) { /* сеть недоступна — честно молчим */ }
  }());

  /* ── 2. Авто-заполнение [data-реестр] значением из правды ──────── */
  function заполнитьДатаРеестр(реестр) {
    try {
      if (!реестр || !реестр.дом || !реестр.счётчики) return;
      var узлы = document.querySelectorAll('[data-реестр]');
      for (var i = 0; i < узлы.length; i++) {
        try {
          var ключ = узлы[i].getAttribute('data-реестр');
          var значение = значение_по_ключу(реестр, ключ);
          if (значение !== null && значение !== undefined) {
            узлы[i].textContent = String(значение);
          }
        } catch (е) { /* один битый узел — остальные живут */ }
      }
    } catch (е) { /* querySelector пропал — не беда всей комнаты */ }
  }

  function значение_по_ключу(реестр, ключ) {
    switch (ключ) {
      case 'дверей': return реестр.счётчики.дверей;
      /* ПРАВДА-2 (F-020): словарь счётчиков — лица читают только его */
      case 'дверей_человек': return реестр.счётчики.дверей_человек;
      case 'песен': return реестр.счётчики.песен;
      case 'песен_очередь_фонд': return реестр.счётчики.песен_очередь_фонд;
      case 'релизы_канала': return реестр.счётчики.релизы_канала;
      case 'языков': return реестр.счётчики.языков;
      case 'версия': return реестр.дом.версия;
      case 'такт': return реестр.дом.такт;
      case 'кэш': return реестр.дом.поколение_кэша;
      case 'воркер': return реестр.дом.воркер;
      /* F-019: SHA живого деплоя — не число реестра, а след выкладки:
         pages.yml ставит его в meta sng-deploy-sha при деплое */
      case 'деплой': return деплой_ша();
      default: return null;
    }
  }

  function деплой_ша() {
    try {
      var м = document.querySelector('meta[name="sng-deploy-sha"]');
      return (м && м.content) ? м.content : null; /* нет меты (локальный файл) — честный фолбэк лица */
    } catch (е) { return null; }
  }

  /* ── 3. Сервис-воркер: только http/https, file:// — молча мимо ── */
  (function зарегистрироватьВоркера() {
    try {
      var протокол = window.location && window.location.protocol;
      if (протокол !== 'http:' && протокол !== 'https:') return;
      if (!navigator.serviceWorker || typeof navigator.serviceWorker.register !== 'function') return;
      var ПУТИ = ['sw15.js', '../sw15.js', '../../sw15.js', '../../../sw15.js'];
      var i = 0;
      function попытка() {
        if (i >= ПУТИ.length) return; /* нет воркера — дом честно живёт без него */
        var p = navigator.serviceWorker.register(ПУТИ[i]);
        i += 1;
        if (p && typeof p.catch === 'function') p.catch(function () { попытка(); });
      }
      попытка();
    } catch (е) { /* SW запрещён — не беда */ }
  }());

  /* ── 4. ЛИК ДОМА (v11.34 «ЛИК» ЛИЦО-1): лицо человека — узнаваемая печать на каждой странице. Золото дома на тёмной пластине; без innerHTML, без ловли мыши, печать не имеет права ломать комнату. ── */
  (function ликДома() {
    function поставить() {
      try {
        if (!document.body) return;
        if (document.querySelector('[data-сг-лик]')) return;
        var NS = 'http://www.w3.org/2000/svg';
        var печать = document.createElement('div');
        печать.setAttribute('data-сг-лик', 'v11.34');
        печать.setAttribute('aria-hidden', 'true');
        печать.style.cssText = 'position:fixed;left:10px;bottom:10px;width:clamp(38px,5.2vmin,56px);height:clamp(38px,5.2vmin,56px);z-index:2147483000;pointer-events:none;opacity:.93;border-radius:50%;background:rgba(16,18,24,.82);box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 0 0 1.5px rgba(176,141,87,.85);';
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 48 48');
        svg.setAttribute('role', 'img');
        svg.style.cssText = 'display:block;width:100%;height:100%;';
        function добавь(тег, атр) {
          var э = document.createElementNS(NS, тег);
          for (var к in атр) { if (Object.prototype.hasOwnProperty.call(атр, к)) э.setAttribute(к, атр[к]); }
          svg.appendChild(э);
        }
        /* лицо человека: голова, глаза, спокойная улыбка, плечи */
        добавь('circle', { cx: '24', cy: '19', r: '9.5', fill: 'none', stroke: '#E8C89C', 'stroke-width': '2' });
        добавь('circle', { cx: '20.6', cy: '17.4', r: '1.5', fill: '#E8C89C' });
        добавь('circle', { cx: '27.4', cy: '17.4', r: '1.5', fill: '#E8C89C' });
        добавь('path', { d: 'M20 21.6 Q24 24.8 28 21.6', fill: 'none', stroke: '#E8C89C', 'stroke-width': '1.8', 'stroke-linecap': 'round' });
        добавь('path', { d: 'M13 40 Q24 29.5 35 40', fill: 'none', stroke: '#E8C89C', 'stroke-width': '2', 'stroke-linecap': 'round' });
        печать.appendChild(svg);
        document.body.appendChild(печать);
        /* v11.35 «ПЕЧАТЬ НЕ НАКРЫВАЕТ» (слово владельца «НАДО КОСЯКИ ВСЕ
           РАЗГРЕБСТИ», 2026-11-14): у комнат с фиксированной полосой «под капот»
           внизу (·15 ОРКЕСТРАТОР, ·02 РЕЗОНАНС…) печать поднимается НАД полосой —
           золотой лик не должен стоять поверх первых слов summary. */
        try {
          if (document.querySelector('.sng-подкапот')) печать.style.bottom = '44px';
        } catch (е2) { /* печать не имеет права ломать комнату */ }
      } catch (е) { /* печать молчит */ }
    }
    try {
      if (document.body) поставить();
      else if (typeof document.addEventListener === 'function') document.addEventListener('DOMContentLoaded', поставить);
    } catch (е) { /* честно молчим */ }
  }());

  /* ── 5. ДЗ-1 (v11.34 «ЛИК»): мировой базовый слой дизайна — золотое кольцо фокуса (WCAG 2.2 Focus Appearance), уважение prefers-reduced-motion, честные тап-цели, сглаживание текста. Ничего не перекрашивает — канон каждой комнаты не тронут. ── */
  (function базаДизайна() {
    try {
      if (document.querySelector('style[data-сг-дизайн]')) return;
      var стиль = document.createElement('style');
      стиль.setAttribute('data-сг-дизайн', 'v11.34');
      стиль.textContent = 'html{-webkit-text-size-adjust:100%}body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}a,button,summary,[role=button],input[type=submit],input[type=button]{touch-action:manipulation;-webkit-tap-highlight-color:transparent}a:focus-visible,button:focus-visible,summary:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible,[role=button]:focus-visible{outline:3px solid #B08D57!important;outline-offset:2px!important;border-radius:4px}@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}';
      var голова = document.head || document.documentElement;
      if (голова) голова.appendChild(стиль);
    } catch (е) { /* слой не обязателен для жизни комнаты */ }
  }());

}());
