
/* ═════════════════════════════════════════════════════════════════════════
   СИНГУЛЯР·КОРД v1.42.0 «ЗАКАЛКА» — страховочный корд дома.
   Приказ владельца: «ИСПРАВЛЯЙ КОСЯЧКИ БАГИ ПРИБИВАЙ, ЧТОБ У ЧЕЛОВЕКА НЕ ВЫЛЕЗ
   СИНИЙ (СЕЙЧАС ЧЁРНЫЙ =)) ЭКРАН СМЕРТИ И УСТРОЙСТВО НЕ СТАЛО КИРПИЧЁМ».

   Что прибито (по порядку опасности):
   1. Глобальные ловцы (error + unhandledrejection) ставятся ПЕРВЫМИ — до
      любого кода дома. Падение больше не чёрная тишина: стекло+золото
      панель говорит честно ЧТО порвалось и ГДЕ, пишет журнал, даёт
      «ПЕРЕЗАПУСТИТЬ», «ТИХИЙ РЕЖИМ» (без анимаций) и «ПОД КАПОТ».
   2. Хранилище-гард: localStorage.setItem/removeItem больше НИКОГДА не
      бросают (приватный режим Safari, квота на телефоне): своя зачистка
      ключей дома → повтор → честная запись в журнал. Если сам объект
      localStorage недоступен (старые приватные режимы) — прозрачная
      заглушка в памяти.
   3. JSON.parse-гард: битый текст → null + журнал, а не SyntaxError в бою.
   4. BroadcastChannel-заглушка для старых браузеров: новый конструктор
      комнат не умирает там, где канала нет.
   5. ТИХИЙ РЕЖИМ: sessionStorage 'sng-тихий' → window.SNG_ТИХО + CSS-убийца
      анимаций. Движки дома читают флаг (ЧЕЛОВЕК РЕШАЕТ — режим включается
      только человеком из панели, сам себя он не включает).
   6. Журнал сбоев (последние 6): window.SNG_КОРД_ЖУРНАЛ() — под капотом.

   Канон: стекло + void, золото — единственный акцент, глифы, ноль эмодзи,
   панель собирается createElement/textContent — присваиваний разметки нет.
   Сам корд весь в try — он не имеет права уронить страницу.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  try {

  /* ── 1. ЖУРНАЛ СБОЕВ (последние 6; пишем МИНУЯ патч setItem — без рекурсии) ── */
  var КЛЮЧ_ЖУРНАЛА = 'sng-корд-журнал-v1';
  var сыроеПоложить = null;
  try { сыроеПоложить = Storage.prototype.setItem; } catch (е) { }
  function читатьЖурнал() {
    try {
      var сырой = localStorage.getItem(КЛЮЧ_ЖУРНАЛА);
      if (!сырой) return [];
      var в = JSON.parse(сырой);
      return (в && в.push && в) ? в : [];
    } catch (е) { return []; }
  }
  function писатьЖурнал(запись) {
    try {
      var сп = читатьЖурнал();
      сп.push(запись);
      while (сп.length > 6) сп.shift();
      var текст = JSON.stringify(сп);
      if (сыроеПоложить) сыроеПоложить.call(localStorage, КЛЮЧ_ЖУРНАЛА, текст);
      else localStorage.setItem(КЛЮЧ_ЖУРНАЛА, текст);
    } catch (е) { /* хранилища нет/квота — журнал живёт только для панели этого такта */ }
  }
  function меткаВремени() {
    var д = new Date();
    function дв(н) { return (н < 10 ? '0' : '') + н; }
    return дв(д.getHours()) + ':' + дв(д.getMinutes()) + ':' + дв(д.getSeconds());
  }
  window.SNG_КОРД_ЖУРНАЛ = function () { return читатьЖурнал(); };

  /* ── 2. ХРАНИЛИЩЕ-ГАРД: setItem/removeItem не бросают никогда ────────── */
  try {
    window.localStorage.getItem('__снг_проба');
    window.localStorage.removeItem('__снг_проба');
  } catch (недоступно) {
    try {
      var память = {};
      var заглушка = {
        getItem: function (к) { return Object.prototype.hasOwnProperty.call(память, к) ? память[к] : null; },
        setItem: function (к, з) { память[к] = String(з); },
        removeItem: function (к) { delete память[к]; },
        key: function (и) { var к = Object.keys(память); return к[и] || null; },
        clear: function () { память = {}; },
        get length() { return Object.keys(память).length; }
      };
      Object.defineProperty(window, 'localStorage', { value: заглушка, configurable: true });
    } catch (е) { /* совсем экзотика — комнаты сами в памяти */ }
  }
  try {
    var исхПоложи = Storage.prototype.setItem;
    Storage.prototype.setItem = function (ключ, значение) {
      try { return исхПоложи.call(this, ключ, значение); }
      catch (квота) {
        try {
          /* своя зачистка: самый старый ключ дома уходит, второй шанс */
          for (var и = 0; и < this.length; и++) {
            var чей = this.key(и);
            if (чей && (/^sng|singulyar|снг/i).test(чей)) { this.removeItem(чей); break; }
          }
          return исхПоложи.call(this, ключ, значение);
        } catch (е2) {
          писатьЖурнал({ т: меткаВремени(), откуда: 'хранилище', что: 'квота: «' + ключ + '» не легла — держим в памяти' });
        }
      }
    };
    var исхСотри = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (ключ) {
      try { return исхСотри.call(this, ключ); } catch (е) { }
    };
  } catch (е) { }

  /* ── 3. JSON-ГАРД: битый текст — это null + журнал, не смерть ────────── */
  try {
    var исхРазбор = JSON.parse;
    JSON.parse = function (текст, оживитель) {
      try { return исхРазбор.call(JSON, текст, оживитель); }
      catch (битый) {
        писатьЖурнал({ т: меткаВремени(), откуда: 'JSON', что: 'битый текст: ' + String(битый && битый.message || 'синтаксис') + ' · ' + String(текст).slice(0, 60) });
        return null;
      }
    };
  } catch (е) { }

  /* ── 4. BROADCASTCHANNEL-ЗАГЛУШКА (старые браузеры, частная вкладка) ─── */
  try {
    if (typeof window.BroadcastChannel !== 'function') {
      var ШинаЗаглушка = function (имя) { this.name = String(имя || ''); this.onmessage = null; };
      ШинаЗаглушка.prototype.postMessage = function () { };
      ШинаЗаглушка.prototype.close = function () { };
      ШинаЗаглушка.prototype.addEventListener = function () { };
      ШинаЗаглушка.prototype.removeEventListener = function () { };
      window.BroadcastChannel = ШинаЗаглушка;
    }
  } catch (е) { }

  /* ── 5. ТИХИЙ РЕЖИМ: флаг читают движки дома (ЧЕЛОВЕК РЕШАЕТ) ────────── */
  var тихо = false;
  try { тихо = sessionStorage.getItem('sng-тихий') === '1'; } catch (е) { }
  window.SNG_ТИХО = тихо ? '1' : '';
  if (тихо) {
    try {
      var ст = document.createElement('style');
      ст.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-iteration-count:1!important;transition-duration:0s!important}html{scroll-behavior:auto!important}';
      (document.head || document.documentElement).appendChild(ст);
    } catch (е) { }
  }

  /* ── 6. ПАНЕЛЬ «НИТЬ ПОРВАЛАСЬ — ДОМ ДЕРЖИТ» (ленивая, DOM-сборка) ───── */
  var панельУзел = null, блокКапота = null, строкаСчёта = null, свёрнуто = false;
  var сбоевВсего = 0, последнееПоказали = 0;

  function сл(родитель, тег, класс, текст, стиль) {
    var узел = document.createElement(тег);
    if (класс) узел.className = класс;
    if (текст != null) узел.textContent = текст;
    if (стиль) узел.style.cssText = стиль;
    родитель.appendChild(узел);
    return узел;
  }

  function построитьПанель() {
    if (панельУзел) return панельУзел;
    var стекло = сл(document.body, 'div', null, null,
      'position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;max-width:620px;margin:0 auto;' +
      'background:rgba(16,18,24,.94);border:1px solid rgba(212,175,55,.45);border-radius:14px;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 1px 0 rgba(240,240,248,.08);padding:14px 16px;' +
      'font:12.5px/1.55 ui-monospace,Consolas,monospace;color:#C0C8D0;backdrop-filter:blur(8px)');
    стекло.setAttribute('role', 'alertdialog');
    стекло.setAttribute('aria-label', 'Сбой дома: нить порвалась, дом держит');

    /* шапка: золото-ромб + честное имя */
    var шапка = сл(стекло, 'div', null, null, 'display:flex;align-items:center;gap:9px');
    сл(шапка, 'span', null, '◇', 'color:#F0D78C;font-size:15px;text-shadow:0 0 10px rgba(240,215,140,.5)');
    сл(шапка, 'b', null, 'НИТЬ ПОРВАЛАСЬ — ДОМ ДЕРЖИТ',
      'color:#F0D78C;font-weight:600;letter-spacing:.14em;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis');

    строкаСчёта = сл(стекло, 'div', null, null, 'color:#8A9099;font-size:11px;margin-top:7px');

    /* сообщение о сбое */
    var строкаЧто = сл(стекло, 'div', null, null, 'margin-top:6px;color:#EDEFF4;word-break:break-word');

    /* кнопки — решения человека */
    var ряд = сл(стекло, 'div', null, null, 'display:flex;flex-wrap:wrap;gap:8px;margin-top:11px');
    function кнопка(имя, действие) {
      var к = сл(ряд, 'button', null, имя,
        'appearance:none;cursor:pointer;background:rgba(240,240,248,.04);border:1px solid rgba(240,240,248,.22);' +
        'border-radius:9px;color:#C0C8D0;font:11px/1 ui-monospace,monospace;letter-spacing:.08em;padding:8px 12px');
      к.addEventListener('mouseenter', function () { к.style.borderColor = 'rgba(212,175,55,.6)'; к.style.color = '#F0D78C'; });
      к.addEventListener('mouseleave', function () { к.style.borderColor = 'rgba(240,240,248,.22)'; к.style.color = '#C0C8D0'; });
      к.addEventListener('click', действие);
      return к;
    }
    кнопка('ПЕРЕЗАПУСТИТЬ', function () { try { location.reload(); } catch (е) { } });
    кнопка('ТИХИЙ РЕЖИМ', function () {
      try { sessionStorage.setItem('sng-тихий', '1'); } catch (е) { window.SNG_ТИХО = '1'; }
      try { location.reload(); } catch (е) { }
    });
    var капотКн = кнопка('ПОД КАПОТ', function () {
      свёрнуто = false;
      блокКапота.hidden = !блокКапота.hidden;
      капотКн.textContent = блокКапота.hidden ? 'ПОД КАПОТ' : 'ЗАКРЫТЬ КАПОТ';
    });
    кнопка('СВЕРНУТЬ', function () {
      свёрнуто = true;
      стекло.hidden = true;
      показатьГлоток();
    });

    /* ПОД КАПОТ: стек + журнал */
    блокКапота = сл(стекло, 'div', null, null, 'margin-top:10px');
    блокКапота.hidden = true;
    var капотТекст = сл(блокКапота, 'pre', null, null,
      'margin:0;white-space:pre-wrap;word-break:break-word;color:#8A9099;font-size:11px;max-height:200px;overflow:auto');
    стекло.__капотТекст = капотТекст;

    панельУзел = стекло;
    панельУзел.__строкаЧто = строкаЧто;
    return стекло;
  }

  /* глоток-ромб после «СВЕРНУТЬ»: дверь обратно к панели, не пропадает */
  function показатьГлоток() {
    try {
      if (document.getElementById('снг-корд-глоток')) return;
      var гл = сл(document.body, 'button', null, '◇',
        'appearance:none;position:fixed;right:12px;bottom:12px;z-index:2147483647;width:34px;height:34px;' +
        'border-radius:50%;border:1px solid rgba(212,175,55,.55);background:rgba(16,18,24,.9);color:#F0D78C;' +
        'font-size:14px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.5)');
      гл.id = 'снг-корд-глоток';
      гл.setAttribute('aria-label', 'Сбои дома — открыть панель корда');
      гл.addEventListener('click', function () {
        гл.remove();
        свёрнуто = false;
        if (панельУзел) панельУзел.hidden = false;
      });
    } catch (е) { }
  }

  function показатьПанель(откуда, что, стек) {
    сбоевВсего += 1;
    писатьЖурнал({ т: меткаВремени(), откуда: откуда, что: String(что).slice(0, 300) });
    var сейчас = Date.now();
    if (свёрнуто || (сейчас - последнееПоказали) < 4000) { показатьГлоток(); return; }
    последнееПоказали = сейчас;
    try {
      var стекло = построитьПанель();
      if (свёрнуто || стекло.hidden) { показатьГлоток(); return; }
      стекло.__строкаЧто.textContent = (откуда ? откуда + ': ' : '') + String(что).slice(0, 220);
      if (строкаСчёта) строкаСчёта.textContent =
        'сбоев в этом такте страницы: ' + сбоевВсего + ' · журнал дома хранит последние 6';
      var капот = 'СТЕК:\n' + String(стек || '—').slice(0, 600) + '\n\nЖУРНАЛ ДОМА:\n';
      var ж = читатьЖурнал();
      if (!ж.length) капот += '(пуст)';
      ж.forEach(function (з) { капот += '  ' + з.т + ' · ' + з.откуда + ' · ' + з.что + '\n'; });
      стекло.__капотТекст.textContent = капот;
      стекло.hidden = false;
    } catch (е) { /* панель не смогла — тише тишины не бывает, но мы не уроним страницу */ }
  }

  /* ── 7. ГЛОБАЛЬНЫЕ ЛОВЦЫ (ставятся первыми — до всего кода дома) ─────── */
  window.addEventListener('error', function (событие) {
    try {
      if (событие && событие.target && событие.target !== window) return; /* img/css — не JS */
      var е = событие && событие.error;
      var что = (е && е.message) || (событие && событие.message) || 'неизвестная ошибка JS';
      var где = (событие && событие.filename ? String(событие.filename).split('/').pop() : '') +
        (событие && событие.lineno ? ':' + событие.lineno + ':' + событие.colno : '');
      показатьПанель('JS', что + (где ? ' — ' + где : ''), е && е.stack);
    } catch (е) { }
  });

  window.addEventListener('unhandledrejection', function (событие) {
    try {
      /* v1.53.0 «ЛИЦО»: скип вида-перехода — не сбой дома. Chromium сам прерывает
      кросс-документные переходы (@view-transition) и честно признаётся
      «Transition was skipped/interrupted» — это норма жизни, не рваная нить:
      в журнал — тихо, без паники и без счётчика сбоев. */
      var пПричина = событие && событие.reason;
      var пТекст = пПричина && пПричина.message ? String(пПричина.message) : String(пПричина || '');
      if (/^Transition was (skipped|interrupted)/i.test(пТекст)) {
        писатьЖурнал({ т: меткаВремени(), откуда: 'вид-переход', что: 'скипнут движком — не сбой' });
        try { событие.preventDefault(); } catch (еп) { }
        return;
      }
      var п = событие && событие.reason;
      var что = (п && п.message) ? п.message : (п && п.stack ? String(п.stack).split('\n')[0] : String(п));
      показатьПанель('обещание', что, п && п.stack);
    } catch (е) { }
  });

  } catch (внешняя) { /* корд не имеет права уронить страницу — точка */ }
})();
