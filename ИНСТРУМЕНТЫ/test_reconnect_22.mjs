/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ RECONNECT/RESUME ЗАЛА ·22 (issue #68 п.3, волна ×13 «Связь»)
   ИНСТРУМЕНТЫ/test_reconnect_22.mjs
   Запуск: node --test ИНСТРУМЕНТЫ/test_reconnect_22.mjs

   Охраняет тихий переход зала на живой релей:
     1) S22.переходПровода — чистое решение из ОТГРУЖЕННОГО файла
        (маркеры S22:CORE-BEGIN/END, песочница vm): упала машина —
        пересборка; замера нет — дорогу держим; все релеи подъёма мертвы
        в свежем замере — переход на живые; подключается — не рвём;
     2) разметка/обвязка: SG_РЕЛЕИ_ПОДЪЁМА, сторож (30 с + событие
        sg-дислокация-готов), антидребезг 2 мин, разговор не рвётся,
        фаза «перестраиваю дорогу…» видна человеку, закрытьКанал гасит сторожа;
     3) e2e: два окна на локальном фейк-релей №1 → свежий замер объявляет
        его мёртвым и называет релей №2 → зал ТИХО переезжает (зал не
        закрывается, код зала прежний), новые WS-соединения едут на №2,
        человек видит фазу перестройки.

   Playwright не обязателен: без него e2e честно skip (его ставит
   воркфлоу «связь-e2e»), юнит всегда на страже.
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

const ЗАМЕР = [
  { url: 'wss://старый.дом', жив: false },
  { url: 'wss://новый.дом', жив: true },
  { url: 'wss://покойник.дом', жив: false }
];

test('S22.переходПровода: машина упала — пересборка дороги, живые названы', () => {
  const S22 = ядроS22();
  const р = S22.переходПровода({ релеиПодъёма: ['wss://а'], замер: ЗАМЕР, машина: 'упала' });
  assert.equal(р.действовать, true);
  assert.match(р.причина, /не поднялась/);
  assert.deepEqual(р.живые, ['wss://новый.дом']);
});

test('S22.переходПровода: подключается — дорогу не рвём (гонки старта честны)', () => {
  const S22 = ядроS22();
  const р = S22.переходПровода({ релеиПодъёма: ['wss://а'], замер: ЗАМЕР, машина: 'подключается' });
  assert.equal(р.действовать, false);
});

test('S22.переходПровода: замера нет — релеи подъёма не опровергнуты, дорога как есть', () => {
  const S22 = ядроS22();
  const р = S22.переходПровода({ релеиПодъёма: ['wss://а'], замер: [], машина: 'поднята' });
  assert.equal(р.действовать, false);
  const п = S22.переходПровода({ релеиПодъёма: [], замер: ЗАМЕР, машина: 'поднята' });
  assert.equal(п.действовать, false, 'пустой список подъёма — не по чему судить');
});

test('S22.переходПровода: хотя бы один релей подъёма жив в замере — дорога жива', () => {
  const S22 = ядроS22();
  const замер = [{ url: 'wss://а', жив: true }, { url: 'wss://б', жив: false }];
  const р = S22.переходПровода({ релеиПодъёма: ['wss://а', 'wss://б'], замер: замер, машина: 'поднята' });
  assert.equal(р.действовать, false);
  assert.match(р.причина, /дорога жива/);
});

test('S22.переходПровода: ВСЕ релеи подъёма пали в свежем замере — тихий переход на живые', () => {
  const S22 = ядроS22();
  const р = S22.переходПровода({
    релеиПодъёма: ['wss://старый.дом', 'wss://покойник.дом', 'wss://внешний.дом'],
    замер: ЗАМЕР, машина: 'поднята'
  });
  assert.equal(р.действовать, true, 'живых из подъёма в замере 0 — переход');
  assert.match(р.причина, /переход на живые/);
  assert.deepEqual(р.живые, ['wss://новый.дом']);
});

test('S22.переходПровода: мусорный вход не роняет вызов (замер/подъём не массивы, null)', () => {
  const S22 = ядроS22();
  for (const состояние of [null, {}, { замер: 'мусор', релеиПодъёма: 'мусор', машина: 'поднята' }, { замер: null, машина: null }]) {
    const р = S22.переходПровода(состояние);
    assert.equal(typeof р.действовать, 'boolean', 'решение всегда булево');
    assert.ok(Array.isArray(р.живые), 'живые всегда массив');
  }
});

test('·22: обвязка сторожа — список подъёма, тик 30 с, событие замера, антидребезг 2 мин, разговор неприкосновенен, закрытие гасит', () => {
  assert.match(HTML, /SG_РЕЛЕИ_ПОДЪЁМА = итог\.slice\(0\)/, 'на чём поднялся зал — зафиксировано');
  assert.match(HTML, /setInterval\(переходПопробуй, 30000\)/, 'сторож тикает раз в 30 с');
  assert.match(HTML, /addEventListener\('sg-дислокация-готов', переходПопробуй\)/, 'свежий замер немедленно решает');
  assert.match(HTML, /т2 - переходПоследний < 120000/, 'антидребезг — не чаще раза в 2 мин');
  assert.match(HTML, /if \(ЗВ\.статус !== 'свободен'\) return;\s+\/\* разговор жив/, 'активный разговор не рвётся');
  assert.match(HTML, /релейСтатус\('перестраиваю дорогу: ' \+ решение\.причина\)/, 'фаза перестройки видна человеку');
  assert.match(HTML, /indexOf\('перестраиваю дорогу'\)/, 'релейСтатус умеет показывать фазу перестройки');
  assert.match(HTML, /сторожСтоп\(\);   \/\* реконнект п\.3: зал закрыт/, 'закрытие зала гасит сторожа');
  assert.match(HTML, /подъёмМомент = Date\.now\(\);/, 'момент подъёма честно отмечен (отличие «подключается» от «упала»)');
  assert.match(HTML, /function поднятьТрансы\(\)/, 'подъём проводов — одна функция для старта и для сторожа');
  assert.equal((HTML.match(/поднимать|пере-opening/g) || []).length, 0, 'без латинизаций: язык дома — русский');
});

/* ═══ e2e: тихий переезд зала с павшего релея на живой ══════════════ */

const МИМЕ = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon'
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
    const релей1 = привинтитьФейкРелей(сервер);
    /* релей №2 — отдельный порт: «следующий живой из свежего замера» */
    const сервер2 = http.createServer((req, res) => { res.writeHead(404); res.end(); });
    const релей2 = привинтитьФейкРелей(сервер2);
    сервер.listen(0, '127.0.0.1', () => {
      сервер2.listen(0, '127.0.0.1', () => {
        res({ сервер, сервер2, релей1, релей2, порт: сервер.address().port, порт2: сервер2.address().port });
      });
    });
  });
}

function патчСтраницы(порт1, порт2) {
  return `
    window.__wsЛог = [];
    window.SG_ДИСЛОКАЦИЯ = { схема: 1, генерация: new Date().toISOString(), источник: 'стенд',
      релеи: [{ url: 'wss://жив1.дом', жив: true }, { url: 'wss://мёртв.дом', жив: false }] };
    const МИР = {};
    window.BroadcastChannel = class {
      constructor(имя) {
        if (Object.prototype.hasOwnProperty.call(МИР, String(имя))) return МИР[String(имя)];
        МИР[String(имя)] = this; this._ом = null;
      }
      postMessage() {}
      set onmessage(ф) { this._ом = ф; }
      get onmessage() { return this._ом; }
      addEventListener() {}
      close() {}
    };
    const НАЗНАЧЕНИЕ = {
      'жив1.дом': 'ws://127.0.0.1:${порт1}',
      'жив2.дом': 'ws://127.0.0.1:${порт2}'
    };
    const НастоящийWS = window.WebSocket;
    window.WebSocket = class extends НастоящийWS {
      constructor(url, прот) {
        const у = String(url);
        let нов = у;
        if (/^(wss|ws):/.test(у)) {
          нов = 'ws://127.0.0.1:${порт1}/?был=' + encodeURIComponent(у);
          for (const ключ in НАЗНАЧЕНИЕ) { if (у.indexOf(ключ) >= 0) { нов = НАЗНАЧЕНИЕ[ключ] + '/?был=' + encodeURIComponent(у); break; } }
        }
        window.__wsЛог.push(у + ' → ' + нов);
        super(нов, прот);
      }
    };
  `;
}

test('e2e reconnect: замер хоронит релей подъёма → зал тихо переезжает на живой, фаза видна, зал не закрывается', { timeout: 240000 }, async (t) => {
  const pw = await import('playwright').catch(() => null);
  if (!pw || !pw.chromium) { t.skip('playwright не установлен в среде — его ставит воркфлоу «связь-e2e»'); return; }

  const стенд = await поднятьСтенд();
  const порт1 = стенд.порт, порт2 = стенд.порт2;
  const ссылка = 'http://127.0.0.1:' + стенд.порт + '/СИНГУЛЯР_22_СВЯЗЬ.html?зал=ТЕСТ1';
  let браузер = null, последняя = null;
  for (const канал of [null, 'chrome', 'msedge']) {
    try { браузер = await pw.chromium.launch({ headless: true, ...(канал ? { channel: канал } : {}) }); break; }
    catch (е) { последняя = е; }
  }
  if (!браузер) { t.skip('нет ни chromium, ни предустановленного chrome/msedge: ' + String(последняя).slice(0, 140)); return; }
  const журналы = [];
  try {
    const контекст = await браузер.newContext();
    const стр = await контекст.newPage();
    стр.on('pageerror', (е) => журналы.push('pageerror: ' + String(е).slice(0, 200)));
    await стр.addInitScript(патчСтраницы(стенд.порт, стенд.порт2));
    await стр.goto(ссылка, { waitUntil: 'domcontentloaded', timeout: 45000 });

    /* зал открылся на релее №1 */
    await стр.waitForFunction(() => {
      const э = document.getElementById('inCode');
      return э && э.value === 'TEST1';
    }, { timeout: 30000 });
    await стр.waitForFunction((п) => (window.__wsЛог || []).some((s) => s.includes('→ ws://127.0.0.1:' + п + '/')), порт1, { timeout: 60000 });
    const подъёмДо = await стр.evaluate(() => (window.SG_РЕЛЕИ_ПОДЪЁМА || []).slice());

    /* свежий замер хоронит жив1 (единственный живой подъёма) и называет жив2 */
    const фаза = await стр.evaluate(() => {
      window.SG_ДИСЛОКАЦИЯ = { схема: 1, генерация: new Date().toISOString(), источник: 'стенд',
        релеи: [{ url: 'wss://жив1.дом', жив: false }, { url: 'wss://жив2.дом', жив: true }] };
      window.dispatchEvent(new CustomEvent('sg-дислокация-готов', { detail: window.SG_ДИСЛОКАЦИЯ }));
      return document.getElementById('stRelay').textContent;
    });
    if (!/перестраиваю дорогу/.test(фаза)) {
      await new Promise((р) => setTimeout(р, 2000));
      const диагностика = await стр.evaluate(() => ({
        stRelay: document.getElementById('stRelay').textContent,
        wsЛог: window.__wsЛог.slice(-8),
        подъём: (window.SG_РЕЛЕИ_ПОДЪЁМА || []).slice(),
        замер: (window.SG_ДИСЛОКАЦИЯ || {}).релеи
      }));
      throw new Error('фаза не показана: сейчас «' + фаза + '», через 2 с «' + диагностика.stRelay +
        '»; wsЛог=' + JSON.stringify(диагностика.wsЛог) + '; подъём=' + JSON.stringify(диагностика.подъём) +
        '; замер=' + JSON.stringify(диагностика.замер) + (журналы.length ? '; ошибки: ' + журналы.join(' | ') : ''));
    }
    assert.match(фаза, /перестраиваю дорогу/, 'фаза перестройки видна человеку немедленно');

    /* зал тихо переехал: новые WS — на релей №2 */
    await стр.waitForFunction((п) => (window.__wsЛог || []).some((s) => s.includes('→ ws://127.0.0.1:' + п + '/')), порт2, { timeout: 90000 });

    const подъёмПосле = await стр.evaluate(() => (window.SG_РЕЛЕИ_ПОДЪЁМА || []).slice());
    assert.ok(подъёмПосле.includes('wss://жив2.дом'), 'новый подъём включает живой релей из свежего замера');
    assert.ok(!подъёмПосле.includes('wss://жив1.дом'), 'павший релей не в новом списке');
    assert.ok(подъёмПосле.length >= 6, 'живой — первым, канон — фолбэком: ' + подъёмПосле.join(','));

    /* ТИХО: зал не закрывался, код зала прежний, журнал не тронут */
    const кодЗала = await стр.locator('#inCode').inputValue();
    assert.equal(кодЗала, 'TEST1', 'зал тот же (resume, не переоткрытие)');
    const стЗал = await стр.locator('#stZal').textContent();
    assert.ok(!/Канал закрыт/.test(стЗал), 'молчаливого закрытия нет: переезд без разрыва зала');

    /* никто не ушёл во внешние релеи */
    const лог = await стр.evaluate(() => window.__wsЛог || []);
    assert.ok(лог.every((с) => с.includes('→ ws://127.0.0.1:')), 'все соединения остались на стенде');
  } finally {
    await браузер.close().catch(() => {});
    стенд.сервер.close();
    стенд.сервер2.close();
  }
});
