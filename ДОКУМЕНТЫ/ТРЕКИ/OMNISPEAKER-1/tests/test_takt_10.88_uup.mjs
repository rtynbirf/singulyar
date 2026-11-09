/* ═══ Такт v10.88 «КАНОН» (С63; СТОП-ГОРН: их v10.87 «УУП» (С62) принята целиком — их ход первым, мой такт перенумерован честно) · OMNISPEAKER-1: тесты uup-core ═══
   Канон один: ДОКУМЕНТЫ/ТРЕКИ/OMNISPEAKER-1/src/uup-core.js —
   тесты грузят ЕГО ЖЕ через node:vm (зал ·31 догружает его
   асинхронно, сервис-воркер держит в пре-кэше). 0 сети · 0 eval
   (vm.runInNewContext — только наш файл). Часы не участвуют:
   «сейчас» и «сегодня» подаются фиксированные. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'uup-core.js');
const code = readFileSync(SRC, 'utf8');

/* Загрузчик канона в песочнице — тот же файл, что зал ·31 догружает скриптом. */
function load() {
  const sandbox = { self: {}, module: { exports: {} }, console };
  vm.runInNewContext(code, sandbox, { filename: 'uup-core.js' });
  const api = sandbox.self.УУПЯДРО || sandbox.module.exports;
  assert.ok(api && api.прозвонит, 'канон не встал в песочницу');
  return api;
}

/* Массивы из vm-realm сравниваются только через JSON (realms разные). */
const rt = (x) => JSON.parse(JSON.stringify(x));

test('00 · канон грузится в песочнице и честно версионируется', () => {
  const К = load();
  assert.equal(К.ver, 'uup-core/0.1');
  assert.equal(typeof К.погодаТекст, 'function');
  assert.equal(typeof К.парсВремя, 'function');
  assert.equal(typeof К.прозвонит, 'function');
  assert.equal(typeof К.ключДня, 'function');
  assert.equal(typeof К.списокБудильников, 'function');
});

test('01 · WMO-таблица покрывает ровно задокументированный набор open-meteo', () => {
  const К = load();
  const ждём = [0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99];
  const ключи = Object.keys(К.wmo).map(Number).sort((а,б)=>а-б);
  assert.deepEqual(ключи, ждём, 'набор кодов WMO ровно промышленный');
  for (const к of ждём) {
    assert.equal(typeof К.wmo[к], 'string');
    assert.ok(К.wmo[к].length > 0, 'описание не пустое: ' + к);
  }
});

test('02 · погодаТекст: неизвестный код — честно, без выдумки', () => {
  const К = load();
  assert.equal(К.погодаТекст(0), 'ясно');
  assert.equal(К.погодаТекст(63), 'дождь');
  assert.equal(К.погодаТекст(99), 'сильная гроза с градом');
  const ч = К.погодаТекст(999);
  assert.ok(ч.includes('999') && ч.includes('описания нет'), 'неизвестный код назван честно');
  assert.equal(К.погодаТекст(NaN), 'нет данных');
  assert.equal(К.погодаТекст(undefined), 'нет данных');
  assert.equal(К.погодаТекст('63'), 'дождь', 'строка-код приведена честно');
});

test('03 · погодаТекст детерминирован (два прогона байт-в-байт)', () => {
  const К = load();
  const а = JSON.stringify([0,3,45,95].map(К.погодаТекст));
  const б = JSON.stringify([0,3,45,95].map(К.погодаТекст));
  assert.equal(а, б);
});

test('04 · парсВремя: границы и честный отказ', () => {
  const К = load();
  assert.equal(К.парсВремя('00:00'), 0);
  assert.equal(К.парсВремя('23:59'), 1439);
  assert.equal(К.парсВремя('7:30'), 450, 'одна цифра часа — честно');
  assert.equal(К.парсВремя(' 07:05 '), 425, 'пробелы снимаются');
  assert.equal(К.парсВремя('24:00'), null);
  assert.equal(К.парсВремя('7:5'), null);
  assert.equal(К.парсВремя('07:60'), null);
  assert.equal(К.парсВремя('бред'), null);
  assert.equal(К.парсВремя(''), null);
  assert.equal(К.парсВремя(null), null);
});

test('05 · прозвонит: точная минута звенит, дедуп «уже сегодня» глушит', () => {
  const К = load();
  const б = { время:'07:30', повтор:'раз', вкл:true };
  assert.deepEqual(rt(К.прозвонит(б, 450, false)), { зазвонит:true, черезМинут:0 });
  assert.deepEqual(rt(К.прозвонит(б, 450, true)),  { зазвонит:false, черезМинут:0 });
});

test('06 · прозвонит: до и после — минуты до переноса через полночь', () => {
  const К = load();
  assert.equal(К.прозвонит({ время:'07:30', вкл:true }, 449, false).черезМинут, 1);
  assert.equal(К.прозвонит({ время:'07:30', вкл:true }, 451, false).черезМинут, 1439);
  /* 23:50 будильник при 00:10 → через 1420 минут (23 ч 40 мин) */
  assert.equal(К.прозвонит({ время:'23:50', вкл:true }, 10, false).черезМинут, 1420);
  assert.equal(К.прозвонит({ время:'00:00', вкл:true }, 0, false).зазвонит, true);
});

test('07 · прозвонит: выкл и мусор — честный отказ с причиной', () => {
  const К = load();
  assert.equal(К.прозвонит({ время:'07:30', вкл:false }, 450, false).зазвонит, false);
  const п = К.прозвонит({ время:'ерунда' }, 450, false);
  assert.equal(п.зазвонит, false); assert.ok(п.причина);
  const н = К.прозвонит(null, 450, false);
  assert.equal(н.зазвонит, false); assert.ok(н.причина);
});

test('08 · прозвонит: плохие «сейчас» не проходят (0..1439 целое)', () => {
  const К = load();
  for (const х of [-1, 1440, 1439.5, NaN, '450']) {
    const п = К.прозвонит({ время:'07:30', вкл:true }, х, false);
    assert.equal(п.зазвонит, false, 'сейчас='+х);
    assert.ok(п.причина, 'причина названа: сейчас='+х);
  }
});

test('09 · поле «повтор» не влияет на срабатывание — день живёт снаружи (закон такта)', () => {
  const К = load();
  const раз   = К.прозвонит({ время:'07:30', повтор:'раз',  вкл:true }, 450, false);
  const день  = К.прозвонит({ время:'07:30', повтор:'день', вкл:true }, 450, false);
  assert.deepEqual(rt(раз), rt(день));
});

test('10 · ключДня: форма «ГГГГ-ММ-ДД», мусор честно null', () => {
  const К = load();
  assert.equal(К.ключДня('2026-10-13T21:04:00Z'), '2026-10-13');
  assert.equal(К.ключДня('2026-10-13'), '2026-10-13');
  assert.equal(К.ключДня('мусор'), null);
  assert.equal(К.ключДня(''), null);
  assert.equal(К.ключДня(null), null);
});

test('11 · списокБудильников: мусор вон, сортировка по времени, канонизация полей', () => {
  const К = load();
  const сырое = [
    { id:'a', время:'09:00', метка:'чай' },
    { id:'b', время:'08:00', метка:'подъём', повтор:'день' },
    { время:'ерунда' },
    {},
    null,
    { id:'c', время:'07:00', метка:'д'.repeat(80), повтор:'каждый день' }
  ];
  const р = К.списокБудильников(сырое);
  assert.equal(р.список.length, 3, 'два мусорных вон');
  assert.deepEqual(rt(р.список.map(x=>x.id)), ['c','b','a'], 'сортировка по времени');
  assert.equal(р.список[0].повтор, 'раз', 'чужое «повтор» канонизируется в «раз»');
  assert.equal(р.список[0].метка.length, 60, 'метка обрезана до 60');
  assert.ok(р.notes.length >= 3, 'честные notes про каждый случай');
  assert.equal(р.список[1].вкл, true, 'вкл по умолчанию — правда');
});

test('12 · потолок 8 честный; кастомный лимит уважается; NaN-лимит → канон', () => {
  const К = load();
  const десять = []; for (let i=0;i<10;i++) десять.push({ id:'б'+i, время:'0'+(i%10)+':00' });
  const р1 = К.списокБудильников(десять);
  assert.equal(р1.список.length, 8);
  assert.ok(JSON.stringify(р1.notes).includes('потолок'), 'note про потолок');
  assert.equal(К.списокБудильников(десять, { лимит:3 }).список.length, 3);
  assert.equal(К.списокБудильников(десять, { лимит:NaN }).список.length, 8, 'NaN → канонический потолок');
});

test('13 · детерминизм: два прогона — JSON байт-в-байт', () => {
  const К = load();
  const сырое = [{id:'z',время:'06:30'},{id:'a',время:'06:30',метка:'два'}];
  assert.equal(JSON.stringify(К.списокБудильников(сырое)), JSON.stringify(К.списокБудильников(сырое)));
});

test('14 · вход не мутируется (канон чистых функций)', () => {
  const К = load();
  const сырое = [{ id:'a', время:'09:00', метка:'чай' }, { время:'ерунда' }];
  const снап = JSON.stringify(сырое);
  К.списокБудильников(сырое);
  assert.equal(JSON.stringify(сырое), снап, 'сырой список не тронут');
  const б = { время:'07:30', вкл:true };
  К.прозвонит(б, 450, false);
  assert.equal(JSON.stringify(б), '{"время":"07:30","вкл":true}', 'будильник не тронут');
});

/* Статив меряет КОД: комментарии срезаются, чтобы «0 document» в шапке не ловился. */
const кодБезКомментариев = code
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');

test('15 · статив исходника: 0 сети · 0 document · 0 localStorage · 0 eval · 0 Date', () => {
  assert.ok(!/\bfetch\s*\(/.test(кодБезКомментариев), 'нет fetch');
  assert.ok(!/\bXMLHttpRequest\b/.test(кодБезКомментариев), 'нет XHR');
  assert.ok(!/\bWebSocket\b/.test(кодБезКомментариев), 'нет WebSocket');
  assert.ok(!/\beval\s*\(|new\s+Function/.test(кодБезКомментариев), 'нет eval/Function');
  assert.ok(!/\bdocument\b/.test(кодБезКомментариев), 'нет document');
  assert.ok(!/\blocalStorage\b/.test(кодБезКомментариев), 'нет localStorage');
  assert.ok(!/\bnew\s+Date\b|\bDate\.now\b/.test(кодБезКомментариев), 'часов внутри нет — время подаётся снаружи');
});

test('16 · экспорт UMD: с module — module.exports; без module — root.УУПЯДРО (одна версия)', () => {
  /* зал ·31 догружает без module → корневой путь */
  const s1 = { self: {}, console };
  vm.runInNewContext(code, s1, { filename: 'uup-core.js' });
  assert.ok(s1.self.УУПЯДРО, 'корневой экспорт встал');
  assert.equal(s1.self.УУПЯДРО.ver, 'uup-core/0.1');
  /* тесты/сборка с module → module.exports */
  const s2 = { self: {}, module: { exports: {} }, console };
  vm.runInNewContext(code, s2, { filename: 'uup-core.js' });
  assert.ok(!s2.self.УУПЯДРО, 'при module корневой путь не трогается');
  assert.equal(s2.module.exports.ver, 'uup-core/0.1', 'module.exports дал ту же версию');
});
