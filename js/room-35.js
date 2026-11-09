/* ═════════════════════════════════════════════════════════════════════════
   ВОПРОСЫ ·35 — room-35.js (такт v10.28 «ЭМЕРДЖЕНТ», кэш v87).
   Единственный исполняемый скрипт двери. Канон:
   • ноль склейки разметки строками — только createElement/textContent и готовые узлы;
   • каждый блок — в try: страница не имеет права уронить себя;
   • ES2019 (Chromium 76 ТВ): без опциональных цепочек, нулевых слияний
     и логических присваиваний — операторы ES2020 не использую;
   • prefers-reduced-motion уважен, фокус видим, цели ≥44px.
   Делает три вещи: кнопки «Открыть все»/«Скрыть все», подсветку вопроса
   по location.hash (#q-N — scroll + класс), живую строку «показано N из M».
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ВЫБРАН = null; /* подсвеченный по хэшу вопрос */

  /* ── 0. helpers ──────────────────────────────────────────────────────── */
  function все() {
    try { return document.querySelectorAll('details.вопр'); }
    catch (е) { try { return document.getElementsByTagName('details'); } catch (е2) { return []; } }
  }

  function тихийРежим() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
      if (window.SNG_ТИХО === '1') return true; /* КОРД: ТИХИЙ РЕЖИМ дома */
    } catch (е) { }
    return false;
  }

  /* ── 1. Живая строка: «показано N из M» ──────────────────────────────── */
  function счёт() {
    try {
      var п = document.getElementById('счётВопросов');
      if (!п) return;
      var список = все(), открыто = 0, i;
      for (i = 0; i < список.length; i++) { if (список[i].open) открыто++; }
      п.textContent = 'показано ' + открыто + ' из ' + список.length;
    } catch (е) { /* строка молчит — страница держит */ }
  }

  /* ── 2. Кнопки «Открыть все» / «Скрыть все» ──────────────────────────── */
  function переключитьВсе(открыть) {
    try {
      var список = все(), i;
      for (i = 0; i < список.length; i++) { список[i].open = открыть; }
    } catch (е) { }
    счёт();
  }

  function кнопки() {
    try {
      var открыть = document.getElementById('кнОткрытьВсе');
      var скрыть = document.getElementById('кнСкрытьВсе');
      if (открыть) открыть.addEventListener('click', function () { переключитьВсе(true); });
      if (скрыть) скрыть.addEventListener('click', function () { переключитьВсе(false); });
    } catch (е) { }
  }

  /* ── 3. Подсветка вопроса по location.hash (#q-N) ────────────────────── */
  function снятьПодсветку() {
    try {
      if (ВЫБРАН) { ВЫБРАН.classList.remove('выбран'); ВЫБРАН = null; }
    } catch (е) { }
  }

  function подсветь() {
    try {
      var ид = location.hash || '';
      if (ид.charAt(0) === '#') ид = ид.slice(1);
      if (!/^q-[0-9]+$/.test(ид)) return;
      var эл = document.getElementById(ид);
      if (!эл || эл.tagName !== 'DETAILS') return;
      снятьПодсветку();
      эл.open = true;                 /* по прямой ссылке ответ открыт */
      эл.classList.add('выбран');     /* золотая рамка подсветки */
      ВЫБРАН = эл;
      счёт();
      try { эл.scrollIntoView({ behavior: тихийРежим() ? 'auto' : 'smooth', block: 'start' }); }
      catch (е2) { try { эл.scrollIntoView(); } catch (е3) { } }
      try { эл.setAttribute('tabindex', '-1'); эл.focus({ preventScroll: true }); } catch (е4) { }
    } catch (е) { }
  }

  /* ── 4. Слушатели: hashchange + toggle (capture — toggle не всплывает) ── */
  function слушай() {
    try { window.addEventListener('hashchange', подсветь); } catch (е) { }
    try { document.addEventListener('toggle', счёт, true); } catch (е) { }
  }

  /* ── 5. Запуск двери ──────────────────────────────────────────────────── */
  function жива() {
    try { кнопки(); } catch (е) { }
    try { слушай(); } catch (е) { }
    try { счёт(); } catch (е) { }
    try { подсветь(); } catch (е) { }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', жива);
  else жива();
})();
