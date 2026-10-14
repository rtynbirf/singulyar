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
}());
