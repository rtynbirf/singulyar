/* ═════════════════════════════════════════════════════════════════════════
   СЛОВАРЬ ·36 — фильтр глоссария (такт v10.28 «ЭМЕРДЖЕНТ», кэш v87).
   Живой фильтр от двух знаков: по тексту термина, определения и мелким
   ключам data-ключи. Честный счётчик «найдено N из M» (aria-live на месте)
   и честная пустота: «АРИАДНА честно признаёт: таких слов в словаре нет».
   ?q= из адреса читается — ссылкой можно поделиться с ключом на ладони.

   Канон: createElement/textContent — присваиваний разметки нет; всё в try —
   фильтр не имеет права уронить дверь. ES2019, ноль сети, ноль трекеров.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var вход = null;
  var счёт = null;
  var пусто = null;
  var термы = [];
  var разделы = [];
  var ссылки = [];
  var всего = 0;

  function норм(с) {
    try { return String(с || '').toLowerCase(); } catch (е) { return ''; }
  }

  function сжать(с) {
    try {
      var т = норм(с).replace(/^[ \t\u00A0]+|[ \t\u00A0]+$/g, '');
      return т.replace(/[ \t\u00A0]+/g, ' ');
    } catch (е) { return ''; }
  }

  /* слово/слова/слов — для честной строки «в словаре N …» */
  function склон(н) {
    var д = н % 100, о = н % 10;
    if (д >= 11 && д <= 14) return 'слов';
    if (о === 1) return 'слово';
    if (о >= 2 && о <= 4) return 'слова';
    return 'слов';
  }

  /* ── разметка-сборка: только createElement/textContent ─────────────────── */
  function собрать() {
    try {
      вход = document.getElementById('словарьПоиск');
      счёт = document.getElementById('словарьСчёт');
      пусто = document.getElementById('словарьПусто');
      var словарь = document.getElementById('словарь');
      if (!вход || !счёт || !пусто || !словарь) return false;

      var списокТ = словарь.querySelectorAll('.термин');
      for (var и = 0; и < списокТ.length; и++) {
        var эл = списокТ[и];
        var стог = норм(эл.textContent);
        var ключи = '';
        try { ключи = эл.getAttribute('data-ключи') || ''; } catch (е) { }
        if (ключи) стог = стог + ' ' + норм(ключи);
        термы.push({ эл: эл, поиск: стог });
      }
      всего = термы.length;

      var списокР = словарь.querySelectorAll('.раздел');
      for (var р = 0; р < списокР.length; р++) {
        разделы.push({ эл: списокР[р], термы: списокР[р].querySelectorAll('.термин') });
      }

      /* линейка: ссылка-буква знает свой раздел — гасим буквы пустых разделов */
      var якоря = {};
      for (var д = 0; д < разделы.length; д++) {
        try { якоря[разделы[д].эл.id] = разделы[д]; } catch (е) { }
      }
      var списокС = document.querySelectorAll('.линейка a.буква');
      for (var с = 0; с < списокС.length; с++) {
        var цель = '';
        try {
          var href = списокС[с].getAttribute('href') || '';
          if (href.charAt(0) === '#') цель = href.substring(1);
        } catch (е) { }
        var сек = цель ? якоря[цель] : null;
        if (сек) ссылки.push({ а: списокС[с], раздел: сек });
      }
      return всего > 0;
    } catch (е) { return false; }
  }

  /* ── фильтр: <2 знаков — показывать всё; честный счёт и честная пустота ── */
  function применить(сырое) {
    try {
      var q = сжать(сырое);
      var живой = q.length >= 2;
      var найдено = 0;
      var и;

      for (и = 0; и < термы.length; и++) {
        var попал = живой ? (термы[и].поиск.indexOf(q) !== -1) : true;
        try { термы[и].эл.hidden = !попал; } catch (е) { }
        if (попал) найдено++;
      }

      for (var р = 0; р < разделы.length; р++) {
        var пуст = true;
        var т = разделы[р].термы;
        for (var ж = 0; ж < т.length; ж++) {
          if (!т[ж].hidden) { пуст = false; break; }
        }
        try { разделы[р].эл.hidden = (живой && пуст); } catch (е) { }
      }

      for (var л = 0; л < ссылки.length; л++) {
        try {
          var потух = живой && ссылки[л].раздел.эл.hidden;
          if (потух) ссылки[л].а.classList.add('буква-потух');
          else ссылки[л].а.classList.remove('буква-потух');
        } catch (е) { }
      }

      if (!живой) {
        счёт.textContent = '⌕ в словаре ' + всего + ' ' + склон(всего) + ' — покажу все; напиши два знака и найду точнее.';
      } else if (найдено > 0) {
        счёт.textContent = 'найдено ' + найдено + ' из ' + всего;
      } else {
        счёт.textContent = 'найдено 0 из ' + всего;
      }

      try { пусто.hidden = !(живой && найдено === 0); } catch (е) { }
    } catch (е) { /* фильтр молчит — страница держит */ }
  }

  /* ── ?q= из адреса: ссылкой можно поделиться ───────────────────────────── */
  function запросИзАдреса() {
    try {
      var сыр = window.location.search || '';
      if (!сыр || сыр.length < 3) return '';
      var пары = сыр.charAt(0) === '?' ? сыр.substring(1) : сыр;
      if (!пары) return '';
      var куски = пары.split('&');
      for (var и = 0; и < куски.length; и++) {
        var к = куски[и];
        if (!к) continue;
        var равно = к.indexOf('=');
        var имя = равно === -1 ? к : к.substring(0, равно);
        if (имя !== 'q') continue;
        var знак = равно === -1 ? '' : к.substring(равно + 1);
        try { знак = decodeURIComponent(знак.replace(/\+/g, ' ')); } catch (е) { /* битый % — берём как есть */ }
        if (знак) return знак;
      }
      return '';
    } catch (е) { return ''; }
  }

  /* ── запуск ─────────────────────────────────────────────────────────────── */
  function жива() {
    try {
      if (!собрать()) return;
      вход.addEventListener('input', function () {
        try { применить(вход.value); } catch (е) { }
      });
      var изАдреса = запросИзАдреса();
      if (изАдреса) {
        try { вход.value = изАдреса; } catch (е) { }
        применить(изАдреса);
      } else {
        применить('');
      }
    } catch (е) { /* дверь держит и без фильтра */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', жива);
  else жива();
})();
