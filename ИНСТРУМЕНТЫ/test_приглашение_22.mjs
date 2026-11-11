/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ E2E «ПРИГЛАШЕНИЕ СОБИРАЕТ ЛЮДЕЙ» (issue #68 п.5, волна ×11)
   ИНСТРУМЕНТЫ/test_приглашение_22.mjs
   Запуск: node --test ИНСТРУМЕНТЫ/test_приглашение_22.mjs

   Инцидент ладки ДИСЛОКАЦИЯ: ссылка ?зал=ТЕСТ1 рассыпала людей по
   случайным залам («S6XHT» ≠ «KHCDD») и вела не в ту дверь. Латка
   починила код зала (js/зал-код.js) и ссылку зала ·22; инцидент
   доказывался живым прогоном двух окон Chromium — вне CI. Этот страж
   делает тот же прогон ДЕТЕРМИНИРОВАННЫМ:

     · два окна Chromium (отдельные контексты) открывают ОДНУ ссылку
       приглашения ·22?зал=ТЕСТ1;
     · все wss://-релеи перееханы на ЛОКАЛЬНЫЙ фейк-NIP-01-релей
       (фейк-релей-nip01.mjs) — ни одного байта во внешнюю сеть;
     · BroadcastChannel изолирован синглтоном на окно: локальный путь
       страниц жив (·22 требует его для открытия зала), но МЕЖДУ
       окнами локально ничего не едет — приветствие обязано приехать
       ПО РЕЛЕЮ через trystero (шифровка паролем зала, релей — шум);

   Верит только DOM: у обоих окон #inCode === «TEST1» (один вход =
   один зал) и в #callList появились кнопки чужого участника («звук ·
   …», «видео · …») — участники появились после подписанного
   приветствия, приехавшего по релею.

   Playwright не обязателен для репозитория: без него страж честно
   skip (его ставит воркфлоу «связь-e2e»).
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { привинтитьФейкРелей } from './фейк-релей-nip01.mjs';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── локальный стенд: файлы дома по HTTP (mjs — с правильным mime) ── */
const МИМЕ = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'
};

/* Статика дома и фейк-релей живут на ОДНОМ порту: страница открывается с
   http://127.0.0.1:порт, и переезд релея на ws://127.0.0.1:порт входит в
   CSP 'self' (дома: connect-src 'self' wss:) — продакшен не тронут. */
function поднятьСтенд(журнал) {
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
    const релей = привинтитьФейкРелей(сервер, журнал);
    сервер.listen(0, '127.0.0.1', () => res({ сервер, релей, порт: сервер.address().port }));
  });
}

/* ── патч страницы ДО её скриптов ────────────────────────────────────
   1) wss/ws → локальный фейк-релей (внешняя сеть запрещена);
   2) BroadcastChannel — синглтон на окно: одноимённый канал одного
      окна не слышен другому окну (межоконный путь — только релей),
      но сам канал жив (·22 без него честно не открывает зал).      */
function патчСтраницы(факУрл) {
  return `
    window.__wsЛог = [];
    const МИР = {};
    window.BroadcastChannel = class {
      constructor(имя) {
        if (Object.prototype.hasOwnProperty.call(МИР, String(имя))) return МИР[String(имя)];
        МИР[String(имя)] = this; this._ом = null;
      }
      postMessage() { /* локальный эфир изолирован: между окнами тишина */ }
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

test('e2e ·22: приглашение ?зал=ТЕСТ1 собирает двух людей по релею (без сети и локального канала)', { timeout: 180000 }, async (t) => {
  const pw = await import('playwright').catch(() => null);
  if (!pw || !pw.chromium) { t.skip('playwright не установлен в среде — его ставит воркфлоу «связь-e2e»'); return; }

  const стенд = await поднятьСтенд((с) => console.log('  ' + с));
  const релейПорт = стенд.порт; /* релей — upgrade того же порта ('self') */
  const ссылка = 'http://127.0.0.1:' + стенд.порт + '/СИНГУЛЯР_22_СВЯЗЬ.html?зал=ТЕСТ1';

  /* запуск — с фолбэком (ран 43041932304: apt-зеркало раннера хронически не
     резолвится, --with-deps висит до таймаута): предустановленный Chrome раннера
     (channel:chrome) и Edge — те же движок и WebRTC, что у chromium; обычный
     chromium playwright — если его браузер установлен в среде. */
  let браузер = null, последняя = null;
  for (const канал of [null, 'chrome', 'msedge']) {
    try { браузер = await pw.chromium.launch({ headless: true, ...(канал ? { channel: канал } : {}) }); break; }
    catch (е) { последняя = е; }
  }
  if (!браузер) { t.skip('нет ни chromium, ни предустановленного chrome/msedge: ' + String(последняя).slice(0, 140)); return; }
  const журналы = [];
  try {
    const окна = [];
    for (let i = 0; i < 2; i++) {
      const контекст = await браузер.newContext();
      const стр = await контекст.newPage();
      стр.on('console', (м) => { if (м.type() === 'error') журналы.push('окно' + i + ': ' + м.text().slice(0, 160)); });
      стр.on('pageerror', (е) => журналы.push('окно' + i + ' pageerror: ' + String(е).slice(0, 160)));
      await стр.addInitScript(патчСтраницы('ws://127.0.0.1:' + релейПорт));
      await стр.goto(ссылка, { waitUntil: 'domcontentloaded', timeout: 45000 });
      окна.push(стр);
    }

    /* один вход = один зал: детерминизм кода зала в живых окнах */
    for (let i = 0; i < 2; i++) {
      await окна[i].waitForFunction(() => {
        const э = document.getElementById('inCode');
        return э && э.value && э.value.length >= 4;
      }, { timeout: 30000 });
      const код = await окна[i].locator('#inCode').inputValue();
      assert.equal(код, 'TEST1', 'окно ' + i + ': «ТЕСТ1» → детерминированный зал TEST1');
    }

    /* участники появляются после подписанного приветствия, приехавшего ПО РЕЛЕЮ:
       в #callList у каждого окна — кнопки («звук · имя», «видео · имя») чужого человека */
    await Promise.all(окна.map((стр, i) => стр.waitForFunction(() => {
      const сетка = document.getElementById('callList');
      return сетка && сетка.querySelectorAll('button').length >= 2;
    }, { timeout: 120000 }).catch(async (е) => {
      const лог = await стр.evaluate(() => window.__wsЛог || []).catch(() => []);
      const стЗал = await стр.locator('#stZal').innerText().catch(() => '?');
      throw new Error('окно ' + i + ': участник по релею не пришёл; wsЛог=' +
        JSON.stringify(лог).slice(0, 400) + '; стЗал=«' + стЗал.slice(0, 160) + '»');
    })));

    /* перебор «пока некому звонить» исчез у обоих — участник именно в списке.
       Сетка скрыта (звонок-секция) — innerText пуст, верим textContent. */
    for (let i = 0; i < 2; i++) {
      const текстСетки = await окна[i].evaluate(() => {
        const с = document.getElementById('callList');
        return с ? с.textContent : '';
      });
      assert.ok(!/пока некому звонить/.test(текстСетки), 'окно ' + i + ': список участников жив');
      const имя = текстСетки.match(/звук · (.*?)без подписи/);
      assert.ok(имя && имя[1].trim().length > 0 && !/^(null|undefined)$/.test(имя[1].trim()),
        'окно ' + i + ': чужой участник в списке с валидным именем («звук · …»)');
    }

    /* ни одно окно не ходило во внешние релеи — всё осталось на локальном стенде */
    for (let i = 0; i < 2; i++) {
      const лог = await окна[i].evaluate(() => window.__wsЛог || []);
      assert.ok(лог.length > 0, 'окно ' + i + ': релейные соединения были');
      assert.ok(лог.every((с) => с.includes('→ ws://127.0.0.1:' + релейПорт)), 'окно ' + i + ': все wss переехали на фейк-релей');
    }
    assert.ok(стенд.релей.событий() > 0, 'фейк-релей реально прокачал события сигналинга');
  } catch (е) {
    if (журналы.length) console.log('  консоли окон (ошибки):\n  ' + журналы.slice(0, 12).join('\n  '));
    throw е;
  } finally {
    await браузер.close().catch(() => {});
    стенд.сервер.close();
  }
});
