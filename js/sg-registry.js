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
  (function загрузитьРеестр() {
    try {
      if (typeof fetch !== 'function') return;
      /* такт v11.25 «САЖЕНЦЫ» (С103): дом живёт на любой глубине —
         дверь в подпапке ищет правду вверх по лестнице (их канон не тронут) */
      var КАНДИДАТЫ = ['data/versions.json', '../data/versions.json', '../../data/versions.json', '../../../data/versions.json'];
      function попытка(i) {
        if (i >= КАНДИДАТЫ.length) return; /* офлайн/file:// — комнаты живут без реестра */
        fetch(КАНДИДАТЫ[i])
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
      case 'песен': return реестр.счётчики.песен;
      case 'языков': return реестр.счётчики.языков;
      case 'версия': return реестр.дом.версия;
      case 'такт': return реестр.дом.такт;
      case 'кэш': return реестр.дом.поколение_кэша;
      case 'воркер': return реестр.дом.воркер;
      default: return null;
    }
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
        печать.style.cssText = 'position:fixed;left:10px;bottom:10px;width:clamp(38px,5.2vmin,56px);height:clamp(38px,5.2vmin,56px);z-index:2147483000;pointer-events:none;opacity:.93;border-radius:50%;background:rgba(16,18,24,.82);box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 0 0 1.5px rgba(212,175,55,.85);';
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
        добавь('circle', { cx: '24', cy: '19', r: '9.5', fill: 'none', stroke: '#E8C56B', 'stroke-width': '2' });
        добавь('circle', { cx: '20.6', cy: '17.4', r: '1.5', fill: '#E8C56B' });
        добавь('circle', { cx: '27.4', cy: '17.4', r: '1.5', fill: '#E8C56B' });
        добавь('path', { d: 'M20 21.6 Q24 24.8 28 21.6', fill: 'none', stroke: '#E8C56B', 'stroke-width': '1.8', 'stroke-linecap': 'round' });
        добавь('path', { d: 'M13 40 Q24 29.5 35 40', fill: 'none', stroke: '#E8C56B', 'stroke-width': '2', 'stroke-linecap': 'round' });
        печать.appendChild(svg);
        document.body.appendChild(печать);
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
      стиль.textContent = 'html{-webkit-text-size-adjust:100%}body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}a,button,summary,[role=button],input[type=submit],input[type=button]{touch-action:manipulation;-webkit-tap-highlight-color:transparent}a:focus-visible,button:focus-visible,summary:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible,[role=button]:focus-visible{outline:3px solid #D4AF37!important;outline-offset:2px!important;border-radius:4px}@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}';
      var голова = document.head || document.documentElement;
      if (голова) голова.appendChild(стиль);
    } catch (е) { /* слой не обязателен для жизни комнаты */ }
  }());

}());
