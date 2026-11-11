/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ ICE-ДИАГНОСТИКИ (issue #68 п.2, волна ·22 «Связь»)
   ИНСТРУМЕНТЫ/test_ice_диагностика.mjs
   Запуск: node --test ИНСТРУМЕНТЫ/test_ice_диагностика.mjs

   Охраняет честную диагностику разговора ·22:
     1) S22.разборICE — чистая функция из ОТГРУЖЕННОГО файла
        (маркеры S22:CORE-BEGIN/END, песочница vm): getStats-отчёт →
        задержка/дрожь/потери/путь; nominated-пара важнее, фолбэк для
        старых сборок, краевые (нет RTT, нет пакетов, мусор) — честно;
     2) разметка #stDiag скрыта по умолчанию и живёт рядом с #stCall;
     3) e2e: два окна Chromium, локальный фейк-NIP-01-релей, синтетический
        микрофон (--use-fake-device-for-media-stream), живой звонок по
        кнопкам зала → разговор → #stDiag показывает живой срез getStats
        («СВЯЗЬ: задержка: … мс · … · путь: …») у ОБОИХ окон.

   Playwright не обязателен для репозитория: без него e2e честно skip
   (его ставит воркфлоу «связь-e2e»), юнит всегда стоит на страже.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { привинтитьФейкРелей } from './фейк-релей-nip01.mjs';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(КОРЕНЬ, 'СИНГУЛЯР_22_СВЯЗЬ.html'), 'utf-8');

/* ── ядро S22 из отгруженного файла — как его получит человек ──────── */
function ядроS22() {
  const начало = HTML.indexOf('/* S22:CORE-BEGIN */');
  const конец = HTML.indexOf('/* S22:CORE-END */');
  assert.ok(начало >= 0 && конец > начало, 'маркеры S22:CORE парные в ·22');
  const кусок = HTML.slice(начало, конец + '/* S22:CORE-END */'.length);
  const пес = {};
  vm.createContext(пес);
  vm.runInContext(кусок + '\nthis.S22 = S22;', пес);
  return пес.S22;
}

/* ── фикстуры: отчёт в формате живого getStats Chromium ────────────── */
function отчёт(пары) {
  return { forEach: (cb) => пары.forEach(([ид, с]) => cb(с, ид)) };
}
function полныйОтчёт() {
  return отчёт([
    ['l1', { type: 'local-candidate', candidateType: 'host' }],
    ['r1', { type: 'remote-candidate', candidateType: 'srflx' }],
    ['p0', { type: 'candidate-pair', state: 'succeeded', nominated: true, priority: 50, currentRoundTripTime: 0.5, localCandidateId: 'l1', remoteCandidateId: 'r1' }],
    ['p1', { type: 'candidate-pair', state: 'succeeded', nominated: true, priority: 900, currentRoundTripTime: 0.1234, localCandidateId: 'l1', remoteCandidateId: 'r1' }],
    ['p2', { type: 'candidate-pair', state: 'failed', nominated: true, priority: 999, currentRoundTripTime: 9 }],
    ['i1', { type: 'inbound-rtp', kind: 'audio', jitter: 0.004, packetsLost: 3, packetsReceived: 997 }],
    ['i2', { type: 'inbound-rtp', kind: 'video', jitter: 0.002, packetsLost: 0, packetsReceived: 500 }]
  ]);
}

test('S22.разборICE: nominated-пара с высшим приоритетом даёт задержку 123 мс, дрожь 4 мс, потери 0.2%, путь «через NAT (STUN)»', () => {
  const S22 = ядроS22();
  const р = S22.разборICE(полныйОтчёт());
  assert.equal(р.готов, true);
  assert.equal(р.задержкаМс, 123, 'RTT 0.1234 с → 123 мс');
  assert.equal(р.дрожьМс, 4, 'jitter max(0.004, 0.002) → 4 мс');
  assert.equal(р.потериПроц, 0.2, '3/(3+1497) → 0.2 %');
  assert.equal(р.путь, 'через NAT (STUN)', 'srflx в кандидатах → NAT');
});

test('S22.разборICE: нет сошедшейся пары — честное «не готово» с причиной', () => {
  const S22 = ядроS22();
  const р = S22.разборICE(отчёт([['p1', { type: 'candidate-pair', state: 'in-progress', nominated: true }]]));
  assert.equal(р.готов, false);
  assert.ok(String(р.причина).length > 3, 'причина названа словами, не пустышкой');
  const п = S22.разборICE(отчёт([]));
  assert.equal(п.готов, false, 'пустой отчёт — тоже не готово');
});

test('S22.разборICE: фолбэк — succeeded-пара без nominated (старые сборки) берётся', () => {
  const S22 = ядроS22();
  const р = S22.разборICE(отчёт([
    ['l1', { type: 'local-candidate', candidateType: 'host' }],
    ['r1', { type: 'remote-candidate', candidateType: 'host' }],
    ['p1', { type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 0.021, localCandidateId: 'l1', remoteCandidateId: 'r1' }]
  ]));
  assert.equal(р.готов, true, 'фолбэк-проход нашёл succeeded-пару');
  assert.equal(р.задержкаМс, 21);
  assert.equal(р.путь, 'прямой (host)', 'host↔host — прямой путь');
});

test('S22.разборICE: relay-кандидат честно назван «релей (TURN)»', () => {
  const S22 = ядроS22();
  const р = S22.разборICE(отчёт([
    ['l1', { type: 'local-candidate', candidateType: 'relay' }],
    ['r1', { type: 'remote-candidate', candidateType: 'host' }],
    ['p1', { type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.08, localCandidateId: 'l1', remoteCandidateId: 'r1' }]
  ]));
  assert.equal(р.путь, 'релей (TURN)');
});

test('S22.разборICE: краевые — RTT/пакеты/дрожь отсутствуют → «—» без выдумки; отрицательный packetsLost не считается', () => {
  const S22 = ядроS22();
  const р = S22.разборICE(отчёт([
    ['p1', { type: 'candidate-pair', state: 'succeeded', nominated: true }],
    ['i1', { type: 'inbound-rtp', kind: 'audio', jitter: -0.5, packetsLost: -3, packetsReceived: 100 }]
  ]));
  assert.equal(р.готов, true);
  assert.equal(р.задержкаМс, null, 'нет RTT — нет числа');
  assert.equal(р.дрожьМс, null, 'отрицательный jitter — мусор, не число');
  assert.equal(р.потериПроц, 0, 'потерь нет (отрицательные не считаются, приём 100)');
});

test('S22.разборICE: словарь-отчёт (без forEach) разбирается тем же кодом', () => {
  const S22 = ядроS22();
  const р = S22.разборICE({
    p1: { type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.25 },
    i1: { type: 'inbound-rtp', kind: 'audio', jitter: 0.01, packetsLost: 1, packetsReceived: 9 }
  });
  assert.equal(р.готов, true);
  assert.equal(р.задержкаМс, 250);
  assert.equal(р.дрожьМс, 10);
  assert.equal(р.потериПроц, 10, '1/(1+9) → 10 %');
});

test('·22: разметка — #stDiag существует, скрыт по умолчанию, живой (aria-live) и стоит рядом с #stCall', () => {
  assert.match(HTML, /<p class="state" id="stDiag" aria-live="polite" hidden><\/p>/, 'строка диагностики скрыта по умолчанию');
  const местоСтал = HTML.indexOf('id="stCall"');
  const местоДиаг = HTML.indexOf('id="stDiag"');
  assert.ok(местоДиаг > местоСтал && местоДиаг - местоСтал < 400, '#stDiag сразу после #stCall — человек видит их вместе');
});

test('·22: обвязка — старт при разговоре (обе точки), стоп при чистке, тик по ICE-state, период 3 с', () => {
  assert.equal((HTML.match(/диагностикуСтарт\(\);/g) || []).length, 2, 'старт ровно в двух точках перехода в «разговор»');
  assert.match(HTML, /setInterval\(диагностикуТик, 3000\)/, 'период диагностики — 3 с');
  assert.match(HTML, /function диагностикуСтоп\(\)/, 'стоп-функция объявлена');
  assert.match(HTML, /звонокРТСЗакрой\(\);\n    диагностикуСтоп\(\);/, 'чистка звонка останавливает диагностику');
  assert.match(HTML, /oniceconnectionstatechange/, 'ICE-state наблюдается — без молчаливой смерти');
  assert.match(HTML, /S22\.разборICE\(отчёт\)/, 'тик разбирает отчёт ядром S22, не своей копией');
});

/* ═══ e2e: живой звонок двух окон через локальный фейк-релей ════════ */

const МИМЕ = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'
};

function поднятьСтенд() {
  return new Promise((res) => {
    const сервер = http.createServer((req, res) => {
      try {
        let путь = decodeURIComponent(new URL(req.url, 'http://стенд').pathname);
        if (путь === '/') путь = '/index.html';
        const файл = join(КОРЕНЬ, путь);
        if (!файл.startsWith(КОРЕНЬ) || !existsSync(файл) || !statSync(файл).isFile()) {
          res.writeHead(404); res.end(); return;
        }
        res.writeHead(200, { 'Content-Type': МИМЕ[extname(файл).toLowerCase()] || 'application/octet-stream' });
        res.end(readFileSync(файл));
      } catch (е) { try { res.writeHead(500); res.end(); } catch (е2) {} }
    });
    const релей = привинтитьФейкРелей(сервер);
    сервер.listen(0, '127.0.0.1', () => res({ сервер, релей, порт: сервер.address().port }));
  });
}

function патчСтраницы(факУрл) {
  return `
    window.__wsЛог = [];
    const МИР = {};
    window.BroadcastChannel = class {
      constructor(имя) {
        if (Object.prototype.hasOwnProperty.call(МИР, String(имя))) return МИР[String(имя)];
        МИР[String(имя)] = this; this._ом = null;
      }
      postMessage() { /* меж окнами локально тишина: звонок едет по релею */ }
      set onmessage(ф) { this._ом = ф; }
      get onmessage() { return this._ом; }
      addEventListener() {}
      close() {}
    };
    const НастоящийWS = window.WebSocket;
    window.WebSocket = class extends НастоящийWS {
      constructor(url, прот) {
        const у = String(url);
        const нов = /^(wss|ws):/.test(у)
          ? ${JSON.stringify(факУрл)} + '/?был=' + encodeURIComponent(у)
          : у;
        window.__wsЛог.push(у + ' → ' + нов);
        super(нов, прот);
      }
    };
  `;
}

test('e2e ICE-диагностика: звонок двух окон → разговор → #stDiag показывает живой срез getStats у обоих', { timeout: 240000 }, async (t) => {
  const pw = await import('playwright').catch(() => null);
  if (!pw || !pw.chromium) { t.skip('playwright не установлен в среде — его ставит воркфлоу «связь-e2e»'); return; }

  const стенд = await поднятьСтенд();
  const ссылка = 'http://127.0.0.1:' + стенд.порт + '/СИНГУЛЯР_22_СВЯЗЬ.html?зал=ТЕСТ1';
  let браузер = null, последняя = null;
  for (const канал of [null, 'chrome', 'msedge']) {
    try {
      браузер = await pw.chromium.launch({
        headless: true,
        args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
        ...(канал ? { channel: канал } : {})
      });
      break;
    } catch (е) { последняя = е; }
  }
  if (!браузер) { t.skip('нет ни chromium, ни предустановленного chrome/msedge: ' + String(последняя).slice(0, 140)); return; }
  const журналы = [];
  try {
    const окна = [];
    for (let i = 0; i < 2; i++) {
      const контекст = await браузер.newContext();
      const стр = await контекст.newPage();
      стр.on('pageerror', (е) => журналы.push('окно' + i + ' pageerror: ' + String(е).slice(0, 160)));
      await стр.addInitScript(патчСтраницы('ws://127.0.0.1:' + стенд.порт));
      await стр.goto(ссылка, { waitUntil: 'domcontentloaded', timeout: 45000 });
      окна.push(стр);
    }

    /* зал один: оба окна в TEST1 и видят друг друга по релею */
    await Promise.all(окна.map((стр) => стр.waitForFunction(() => {
      const сетка = document.getElementById('callList');
      return сетка && сетка.querySelectorAll('button').length >= 2;
    }, { timeout: 120000 })));

    /* панель звонка — details-спойлер дома: раскрываем, как это делает
       человек («открыть панель»), иначе кнопки зала невидимы для клика */
    await окна[0].evaluate(() => document.querySelectorAll('details').forEach((д) => { д.open = true; }));
    await окна[1].evaluate(() => document.querySelectorAll('details').forEach((д) => { д.open = true; }));

    /* окно A звонит: первая кнопка аудиозвонка («звук · имя чужого»);
       сетка перерисовывается по статусам — кликаем свежую кнопку */
    const кнопкаЗвонка = окна[0].locator('#callList button', { hasText: 'звук · ' }).first();
    await кнопкаЗвонка.click({ timeout: 30000 });

    /* окно B видит входящий и принимает */
    await окна[1].waitForFunction(() => {
      const с = document.getElementById('stCall');
      return с && /ВХОДЯЩИЙ ЗВОНОК/.test(с.textContent);
    }, { timeout: 45000 });
    await окна[1].evaluate(() => { document.querySelectorAll('details').forEach((д) => { д.open = true; }); });
    await окна[1].locator('#btnAccept').click({ timeout: 30000 });

    /* разговор у обоих */
    await Promise.all(окна.map((стр) => стр.waitForFunction(() => {
      const с = document.getElementById('stCall');
      return с && /ЗВОНОК: разговор/.test(с.textContent);
    }, { timeout: 60000 })));

    /* диагностика живая у обоих: getStats сошёлся, человек видит срез */
    await Promise.all(окна.map((стр, i) => стр.waitForFunction(() => {
      const д = document.getElementById('stDiag');
      return д && !д.hidden && /СВЯЗЬ:/.test(д.textContent) && /путь:/.test(д.textContent);
    }, { timeout: 90000 }).catch(async () => {
      const т = await окна[i].locator('#stDiag').textContent().catch(() => '(нет)');
      throw new Error('окно ' + i + ': диагностика не показана; stDiag=«' + т + '»');
    })));

    /* срез честный: строка содержит слова измерений, а не заглушки */
    for (let i = 0; i < 2; i++) {
      const т = await окна[i].locator('#stDiag').textContent();
      assert.match(т, /задержка:/, 'окно ' + i + ': задержка названа');
      assert.match(т, /путь:/, 'окно ' + i + ': путь назван');
    }
    /* завершение скрывает строку: конец разговора — конец диагностики */
    await окна[0].evaluate(() => { document.querySelectorAll('details').forEach((д) => { д.open = true; }); });
    await окна[0].locator('#btnEnd').click({ timeout: 30000 });
    await окна[0].waitForFunction(() => {
      const д = document.getElementById('stDiag');
      return д && д.hidden && !д.textContent;
    }, { timeout: 30000 });
  } catch (е) {
    if (журналы.length) console.log('  pageerror:\n  ' + журналы.slice(0, 12).join('\n  '));
    throw е;
  } finally {
    await браузер.close().catch(() => {});
    стенд.сервер.close();
  }
});
