/* TH-AUDIO-44 (AUDIT-2026-1030 P0-4): минус-фонд переехал из git в релиз.
   TH-AUDIO-44b (ремонт тишины): релизные ассеты не отдают Access-Control-Allow-Origin,
   а зал ·31 держит <audio> в WebAudio-графе (createMediaElementSource) — кросс-доменный
   элемент без CORS отдаёт в граф тишину (taint). Лечение: фонд отдаёт
   raw.githubusercontent.com на ветке minus-fond (= a63089e, те же git-блобы, 0 доп.
   веса репо): ACAO:*, content-type audio/mpeg, Range 206 — граф и fetch байтов живут.
   Схема путей ветки = прежнее дерево minus/: голос/<id>.mp3 · чистый-минус/<id>.mp3 ·
   сборник/сборник-N.mp3 · корень prosto-lubi.mp3. Шасси дома ./minus/prosto-lubi.mp3
   остаётся same-origin в репо. Один факт — одно место: пути к фонду строятся ТОЛЬКО здесь.
   TH-AUDIO-45 «ДВЕРЬ-0» (2026-11-11, ремонт тишины №2): серверный аудит подтвердил —
   все 133 файла фонда поют (raw 206 audio/mpeg ACAO:*, jsDelivr 206, шасси 206, зал 206),
   но владелец слышит тишину: его провайдер душит raw/jsDelivr, при этом зал (github.io)
   до него доходит. Лечение: голос/ (62 файла, 458MB) материализуется pages.yml из ветки
   minus-fond прямо в артефакт Pages (репо не толстеет) => голос играет same-origin,
   дверь-0 неубиваема на сети владельца. МИН и Сборник остаются на raw/jsDelivr;
   лестница зала МИН→МАКС сама приводит в голос (дверь-0). Если выкладка старая и файла
   нет — 404 уходит в существующую лестницу, регресса нет. */
(function () {
  'use strict';
  function enc(s) { /* сегментное кодирование: кириллица в пути честная, слэши не трогаем */
    return s.split('/').map(encodeURIComponent).join('/');
  }
  function norm(s) { return String(s).replace(/^\.\//, '').replace(/^minus\//, ''); }
  var BASE = 'https://raw.githubusercontent.com/rtynbirf/singulyar/minus-fond/minus/';
  function minusUrl(rel) {
    var s = norm(rel);
    /* TH-AUDIO-45 дверь-0: голос автора — same-origin из выкладки Pages */
    if (s.indexOf('голос/') === 0) return './minus/' + enc(s);
    return BASE + enc(s);
  }
  /* С172 «ВСТРЕЧАЕТ ФЛАГМАН»: вторая дверь фонда — jsDelivr отдаёт те же
     git-блобы ветки minus-fond (проверено: 206, audio/mpeg, ACAO:*, Range).
     raw.githubusercontent дрожит у части провайдеров — фонд не имеет права
     молчать, когда есть вторая дверь. Пути — те же, что и у первички. */
  var MIRROR = 'https://cdn.jsdelivr.net/gh/rtynbirf/singulyar@minus-fond/minus/';
  function minusUrlMirror(rel) {
    return MIRROR + enc(norm(rel));
  }
  window.minusUrl = minusUrl;
  window.minusUrlMirror = minusUrlMirror;
  window.MINUS_FOND_TAG = 'MINUS-FOND-2026-10-30';
  window.MINUS_FOND_MIRROR_TAG = 'MINUS-MIRROR-2026-11-06';
  window.MINUS_DOOR0_TAG = 'DOOR0-GOLOS-SAMEORIGIN-2026-11-11';
})();
