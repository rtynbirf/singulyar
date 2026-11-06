/* TH-AUDIO-44 (AUDIT-2026-1030 P0-4): минус-фонд переехал из git в релиз.
   TH-AUDIO-44b (ремонт тишины): релизные ассеты не отдают Access-Control-Allow-Origin,
   а зал ·31 держит <audio> в WebAudio-графе (createMediaElementSource) — кросс-доменный
   элемент без CORS отдаёт в граф тишину (taint). Лечение: фонд отдаёт
   raw.githubusercontent.com на ветке minus-fond (= a63089e, те же git-блобы, 0 доп.
   веса репо): ACAO:*, content-type audio/mpeg, Range 206 — граф и fetch байтов живут.
   Схема путей ветки = прежнее дерево minus/: голос/<id>.mp3 · чистый-минус/<id>.mp3 ·
   сборник/сборник-N.mp3 · корень prosto-lubi.mp3. Шасси дома ./minus/prosto-lubi.mp3
   остаётся same-origin в репо. Один факт — одно место: пути к фонду строятся ТОЛЬКО здесь. */
(function () {
  'use strict';
  var BASE = 'https://raw.githubusercontent.com/rtynbirf/singulyar/minus-fond/minus/';
  function minusUrl(rel) {
    var s = String(rel).replace(/^\.\//, '').replace(/^minus\//, '');
    /* сегментное кодирование: кириллица в пути честная, слэши не трогаем */
    return BASE + s.split('/').map(encodeURIComponent).join('/');
  }
  /* С172 «ВСТРЕЧАЕТ ФЛАГМАН»: вторая дверь фонда — jsDelivr отдаёт те же
     git-блобы ветки minus-fond (проверено: 206, audio/mpeg, ACAO:*, Range).
     raw.githubusercontent дрожит у части провайдеров — фонд не имеет права
     молчать, когда есть вторая дверь. Пути — те же, что и у первички. */
  var MIRROR = 'https://cdn.jsdelivr.net/gh/rtynbirf/singulyar@minus-fond/minus/';
  function minusUrlMirror(rel) {
    var s = String(rel).replace(/^\.\//, '').replace(/^minus\//, '');
    return MIRROR + s.split('/').map(encodeURIComponent).join('/');
  }
  window.minusUrl = minusUrl;
  window.minusUrlMirror = minusUrlMirror;
  window.MINUS_FOND_TAG = 'MINUS-FOND-2026-10-30';
  window.MINUS_FOND_MIRROR_TAG = 'MINUS-MIRROR-2026-11-06';
})();
