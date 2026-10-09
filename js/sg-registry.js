/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · РЕЕСТР ВЕРСИЙ — общий мини-скрипт новых дверей (·35–·38)
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
      fetch('data/versions.json')
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
        .catch(function () { /* офлайн/file:// — комнаты живут без реестра */ });
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
      var попытка = navigator.serviceWorker.register('sw15.js');
      if (попытка && typeof попытка.catch === 'function') {
        попытка.catch(function () { /* нет воркера — дом честно живёт без него */ });
      }
    } catch (е) { /* SW запрещён — не беда */ }
  }());
}());
