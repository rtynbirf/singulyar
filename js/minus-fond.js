/* TH-AUDIO-44 (AUDIT-2026-1030 P0-4): минус-фонд переехал из git в релиз.
   Единая точка сборки URL: window.minusUrl('голос/ID.mp3') → ассет релиза (ASCII-префикс).
   Схема имён ассетов: golos__<id>.mp3 · chistyi-minus__<id>.mp3 · sbornik__sbornik-N.mp3.
   Шасси дома minus/prosto-lubi.mp3 ОСТАЛОСЬ в репо — same-origin fetch для TRACK_BUF
   (WebAudio, закон v11.41 «вэб-аудио доступно»). Кросс-доменные ассеты вне пре-кэша
   (закон SW: медиа не пре-кэшируется); офлайн-копия минуса — выбор файла вручную (·15).
   Один факт — одно место: пути к фонду строятся ТОЛЬКО здесь. */
(function () {
  'use strict';
  var TAG = 'MINUS-FOND-2026-10-30';
  var BASE = 'https://github.com/rtynbirf/singulyar/releases/download/' + TAG + '/';
  var PREFIX = { 'голос/': 'golos__', 'чистый-минус/': 'chistyi-minus__', 'сборник/': 'sbornik__' };
  function minusUrl(rel) {
    var s = String(rel).replace(/^\.\//, '').replace(/^minus\//, '');
    for (var p in PREFIX) {
      if (s.indexOf(p) === 0) {
        var fn = s.slice(p.length);
        if (p === 'сборник/') fn = fn.replace(/^сборник-/, 'sbornik-');
        return BASE + encodeURIComponent(PREFIX[p] + fn);
      }
    }
    /* корень фонда: безголосые-исключения v10.69 — файла в репо не было и тут нет,
       404 честен (как и был на сайте); шасси prosto-lubi.mp3 идёт мимо шима */
    return BASE + encodeURIComponent(s);
  }
  window.minusUrl = minusUrl;
  window.MINUS_FOND_TAG = TAG;
})();
