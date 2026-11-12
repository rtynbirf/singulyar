/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ ЛИМИТОВ MESH ЗАЛА ·22 (issue #68 п.4, волна ×15)
   ИНСТРУМЕНТЫ/test_лимиты_mesh_22.mjs
   Запуск: node --test ИНСТРУМЕНТЫ/test_лимиты_mesh_22.mjs

   Задание #68: «N участников зала ·22 — память/CPU/частота сообщений;
   измеренный лимит честно вписать в UI». Дом меряет, а не декларирует:

     · N виртуальных участников заходят в ОДИН зал по настоящему
       WebSocket на ЛОКАЛЬНЫЙ фейк-NIP-01-релей (тот же стенд, что у
       e2e приглашения) — тот же провод сигналинга, что у trystero в
       ·22: REQ-подписка на зал, EVENT-приветствие, fan-out релея;
     · волна приветствий: каждый публикует одно — меряется полнота
       доставки (N(N−1) прибытий), время волны, задержка p50/p95,
       CPU релея на событие, heap релея;
     · всплеск чата (20 × 10 сообщений): частота сообщений без потерь;
     · математика сетки звонков N(N−1)/2 (полносвязный WebRTC mesh) —
       и строка честного лимита в UI ·22 (#stЛимит) не молчит.

   Гарантии проверяются ЖЁСТКО (доставка 100%, каждый получил ровно
   N−1, ни одного оборванного провода). Машино-зависимые числа
   (миллисекунды, CPU, МБ) — ПЕЧАТАЮТСЯ фактом замера для летописи,
   но не пунктируются в ноль: у песочницы и ноутбука владельца
   разная физика, дом не выдумывает одинаковость.

   Рекорд замера по умолчанию — 40 участников (МЕШ_МАКС можно
   понизить на тесной машине; верхняя ступень не повышает обещание
   в UI — оно растёт только новым честным замером).
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { привинтитьФейкРелей } from './фейк-релей-nip01.mjs';

/* стенд: тот же http-сервер держит релей (upgrade), teardown гасит
   СОКЕТЫ принудительно (сервер.close() не трогает upgraded-сокеты —
   процесс теста иначе виснет на них) и только потом сам сервер */
function поднятьСтенд() {
  const сервер = http.createServer((req, res) => { res.writeHead(404); res.end(); });
  const релей = привинтитьФейкРелей(сервер, null);
  return new Promise((ок) => {
    сервер.listen(0, '127.0.0.1', () => ок({
      релей,
      url: 'ws://127.0.0.1:' + сервер.address().port,
      закрыть: async () => {
        for (const г of _все_гости) г.закрыть();
        сервер.closeAllConnections();
        await new Promise((р) => сервер.close(р));
      }
    }));
  });
}
const _все_гости = new Set();

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ЗАЛ = 'МЛИН1';                            /* код зала замера (5 знаков алфавита зал-кода) */
const СТУПЕНИ = (() => {
  const макс = Number(process.env.МЕШ_МАКС || 40);
  assert.ok(Number.isFinite(макс) && макс >= 8, 'МЕШ_МАКС >= 8 (ступени 8 и верхняя)');
  const с = [...new Set([8, 20, макс])].sort((a, b) => a - b);
  return с;
})();
const ВСПЛЕСК_НА_ГОСТЯ = 10;                    /* сообщений на гостя во всплеске */

/* ── участник: настоящий WebSocket на локальный релей ─────────────── */
class Гость {
  constructor(url, имя) {
    this.имя = имя;
    this.получено = new Set();                  /* id чужих событий волны */
    this.задержки = [];
    this.готово = false;
    this.ошибок = 0;
    this.ws = new WebSocket(url);
    this.ws.addEventListener('error', () => { this.ошибок++; });
    _все_гости.add(this);
  }
  открыть() {
    return new Promise((ок, не) => {
      const т = setTimeout(() => не(new Error('релей не открылся за 5 с')), 5000);
      this.ws.addEventListener('open', () => { clearTimeout(т); ок(); }, { once: true });
    });
  }
  послать(пачка) { this.ws.send(JSON.stringify(пачка)); }
  подписаться(кодЗала) {
    return new Promise((ок) => {
      const на = (м) => {
        const д = JSON.parse(м.data);
        if (Array.isArray(д) && д[0] === 'EOSE') {
          this.ws.removeEventListener('message', на);
          ок();
        }
      };
      this.ws.addEventListener('message', на);
      this.послать(['REQ', 'зал', { kinds: [1], '#зал': [кодЗала] }]);
    });
  }
  слушать() {
    this.ws.addEventListener('message', (м) => {
      try {
        const д = JSON.parse(м.data);
        if (!Array.isArray(д) || д[0] !== 'EVENT') return;
        const событие = д[2];
        const с = JSON.parse(событие.content || '{}');
        if (typeof с.т === 'number') this.задержки.push(Date.now() - с.т);
        if (с.кто && с.кто !== this.имя) this.получено.add(String(событие.id));
      } catch { /* чужой шум стенда не роняет гостя */ }
    });
  }
  публиковать(текст) {
    const событие = {
      pubkey: crypto.createHash('sha256').update(this.имя).digest('hex'),
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [['зал', ЗАЛ]],
      content: JSON.stringify({ кто: this.имя, текст: текст.slice(0, 40), т: Date.now() })
    };
    /* Nostr-id честно: sha256 сериализации [0,pubkey,created_at,kind,tags,content] */
    событие.id = crypto.createHash('sha256')
      .update(JSON.stringify([0, событие.pubkey, событие.created_at, событие.kind, событие.tags, событие.content]))
      .digest('hex');
    событие.sig = '0'.repeat(128);              /* подписи релей стенда не проверяет (шапка фейк-релея) */
    this.послать(['EVENT', событие]);
    return событие.id;
  }
  закрыть() { _все_гости.delete(this); try { this.ws.close(); } catch { /* уже закрыт */ } }
}

function перцентиль(массив, п) {
  if (!массив.length) return NaN;
  const с = [...массив].sort((a, b) => a - b);
  return с[Math.min(с.length - 1, Math.floor((п / 100) * с.length))];
}

async function замерВолны(релей, N) {
  const гости = [];
  for (let i = 0; i < N; i++) гости.push(new Гость(релей.url, 'гость' + i));
  for (const г of гости) await г.открыть();
  for (const г of гости) await г.подписаться(ЗАЛ);
  for (const г of гости) г.слушать();

  const cpu0 = process.cpuUsage();
  const mem0 = process.memoryUsage();
  const t0 = Date.now();
  for (const г of гости) г.публиковать('здравствуй, зал');
  /* волна кончилась, когда каждый получил ровно N−1 чужих */
  const всего = N * (N - 1);
  const дедлайн = t0 + 30000;
  while (Date.now() < дедлайн) {
    const собрано = гости.reduce((с, г) => с + г.получено.size, 0);
    if (собрано >= всего) break;
    await new Promise((р) => setTimeout(р, 15));
  }
  const t1 = Date.now();
  const cpu1 = process.cpuUsage(cpu0);
  const mem1 = process.memoryUsage();

  const собрано = гости.reduce((с, г) => с + г.получено.size, 0);
  const задержки = гости.flatMap((г) => г.задержки);
  const факт = {
    N,
    событий_опубликовано: N,
    прибытий_ждано: всего,
    прибытий: собрано,
    волна_мс: t1 - t0,
    p50_мс: Math.round(перцентиль(задержки, 50)),
    p95_мс: Math.round(перцентиль(задержки, 95)),
    cpu_релея_мкс_на_прибытие: Math.round(((cpu1.user + cpu1.system) / Math.max(1, собрано))),
    heap_релея_МБ_дельта: +((mem1.heapUsed - mem0.heapUsed) / 1048576).toFixed(1),
    ошибок_проводов: гости.reduce((с, г) => с + г.ошибок, 0)
  };
  for (const г of гости) г.закрыть();
  return факт;
}

test('лимиты mesh ·22: волна приветствий — доставка полная на каждой ступени, замер провода фактом', { timeout: 120000 }, async (t) => {
  if (typeof WebSocket === 'undefined') { t.skip('в этой ноде нет WebSocket-клиента (нужен Node ≥ 22)'); return; }
  const стенд = await поднятьСтенд();
  try {
    const протокол = [];
    for (const N of СТУПЕНИ) {
      const факт = await замерВолны(стенд, N);
      протокол.push(факт);
      /* ЖЁСТКИЕ гарантии: доставка, полнота, провод цел */
      assert.equal(факт.прибытий, факт.прибытий_ждано,
        'N=' + N + ': fan-out полносвязный — каждая из ' + факт.прибытий_ждано + ' прибытий доставлена');
      assert.equal(факт.ошибок_проводов, 0, 'N=' + N + ': ни одного оборванного провода');
      assert.ok(факт.p95_мс < 5000, 'N=' + N + ': p95 задержки < 5 с на локальном стенде (факт: ' + факт.p95_мс + ' мс)');
    }
    console.log('\n  ЗАМЕР МЕШ ·22 (локальный фейк-NIP-01-релей, Node ' + process.version + '):');
    for (const ф of протокол) {
      console.log('  · N=' + ф.N +
        ' | волна ' + ф.волна_мс + ' мс' +
        ' | p50 ' + ф.p50_мс + ' мс / p95 ' + ф.p95_мс + ' мс' +
        ' | cpu релея ' + ф.cpu_релея_мкс_на_прибытие + ' мкс/прибытие' +
        ' | heap Δ ' + ф.heap_релея_МБ_дельта + ' МБ' +
        ' | прибытий ' + ф.прибытий + '/' + ф.прибытий_ждано);
    }
    const верх = протокол[протокол.length - 1];
    assert.ok(верх.N === Math.max(...СТУПЕНИ), 'верхняя ступень замера — заявленная');
  } finally {
    await стенд.закрыть();
  }
});

test('лимиты mesh ·22: всплеск чата 20×' + ВСПЛЕСК_НА_ГОСТЯ + ' — частота сообщений без потерь', { timeout: 120000 }, async (t) => {
  if (typeof WebSocket === 'undefined') { t.skip('в этой ноде нет WebSocket-клиента (нужен Node ≥ 22)'); return; }
  const стенд = await поднятьСтенд();
  try {
    const N = Math.min(20, Math.max(...СТУПЕНИ));
    const гости = [];
    for (let i = 0; i < N; i++) гости.push(new Гость(стенд.url, 'ч' + i));
    for (const г of гости) await г.открыть();
    for (const г of гости) await г.подписаться(ЗАЛ);
    for (const г of гости) г.слушать();

    const cpu0 = process.cpuUsage();
    const t0 = Date.now();
    for (let k = 0; k < ВСПЛЕСК_НА_ГОСТЯ; k++) for (const г of гости) г.публиковать('строка ' + k);
    const ждали = N * (N - 1) * ВСПЛЕСК_НА_ГОСТЯ;
    const дедлайн = t0 + 30000;
    while (Date.now() < дедлайн) {
      const собрано = гости.reduce((с, г) => с + г.получено.size, 0);
      if (собрано >= ждали) break;
      await new Promise((р) => setTimeout(р, 15));
    }
    const t1 = Date.now();
    const cpu1 = process.cpuUsage(cpu0);

    const собрано = гости.reduce((с, г) => с + г.получено.size, 0);
    const задержки = гости.flatMap((г) => г.задержки);
    const сек = (t1 - t0) / 1000;
    console.log('\n  ЗАМЕР ВСПЛЕСК: N=' + N + ' × ' + ВСПЛЕСК_НА_ГОСТЯ + ' = ' + (N * ВСПЛЕСК_НА_ГОСТЯ) +
      ' событий → ' + ждали + ' прибытий за ' + (t1 - t0) + ' мс' +
      ' | ' + Math.round(ждали / сек) + ' прибытий/с' +
      ' | p50 ' + Math.round(перцентиль(задержки, 50)) + ' мс / p95 ' + Math.round(перцентиль(задержки, 95)) + ' мс' +
      ' | cpu релея ' + Math.round((cpu1.user + cpu1.system) / Math.max(1, собрано)) + ' мкс/прибытие');
    assert.equal(собрано, ждали, 'всплеск без потерь: каждая строка дошла каждому из ' + N);
    for (const г of гости) г.закрыть();
  } finally {
    await стенд.закрыть();
  }
});

test('лимиты mesh ·22: математика сетки N(N−1)/2 и строка честного лимита живы в UI', () => {
  /* полносвязный mesh звонка: нитей = N(N−1)/2 — конституция WebRTC-mesh */
  const нитей = (N) => (N * (N - 1)) / 2;
  assert.equal(нитей(2), 1);
  assert.equal(нитей(8), 28);
  assert.equal(нитей(20), 190);
  assert.equal(нитей(40), 780);

  const HTML = readFileSync(join(КОРЕНЬ, 'СИНГУЛЯР_22_СВЯЗЬ.html'), 'utf-8');
  const начало = HTML.indexOf('id="stЛимит"');
  assert.ok(начало > 0, 'в ·22 есть #stЛимит — измеренный лимит вписан в UI, не в рассказы');
  const кусок = HTML.slice(начало, начало + 900);
  assert.match(кусок, /40 участников/, 'строка лимита называет верхнюю ступень замера (40)');
  assert.match(кусок, /N\(N−1\)\/2/, 'строка лимита держит математику полносвязной сетки');
  assert.match(кусок, /стенд-замер/i, 'строка лимита честно называет источник: замер, не обещание');
  assert.match(кусок, /test_лимиты_mesh_22/, 'строка лимита даёт путь к стражу — любой может повторить');
});
