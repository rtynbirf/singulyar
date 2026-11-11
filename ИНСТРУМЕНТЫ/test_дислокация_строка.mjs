/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ ЖИВОЙ СТРОКИ ДИСЛОКАЦИИ (issue #68 п.1, волна ×11 «Связь»)
   ИНСТРУМЕНТЫ/test_дислокация_строка.mjs

   Охраняет честную строку ·22 «дислокация · замер CI»:
     1) числа ТОЛЬКО из факта замера (data/дислокация.json): живые/все,
        источник, возраст замера — руками их не набить;
     2) нет замера / пустые релеи — строка честно скрыта (hidden);
     3) перерисовка по событию sg-дислокация-готов (sg-registry.js);
     4) sg-registry приносит замер с cache-buster (?t=) и перечитывает
        правду каждые 5 минут (режим реального времени, грабля 6bdb0cd).

   Как работает: настоящий инлайн-скрипт ·22 вырезается по маркерам
   <!--СНГ:ДИСЛОКАЦИЯ-->…<!--/СНГ:ДИСЛОКАЦИЯ--> и исполняется в vm
   с честным DOM-стабом — охраняется живой код страницы, не копия.
   Детерминировано, без сети и браузера.
   Запуск: node --test ИНСТРУМЕНТЫ/test_дислокация_строка.mjs
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(КОРЕНЬ, 'СИНГУЛЯР_22_СВЯЗЬ.html'), 'utf-8');

/* ── вырезать настоящий скрипт строки по маркерам дома ─────────────── */
function скриптСтроки() {
  const начало = HTML.indexOf('<!--СНГ:ДИСЛОКАЦИЯ-->');
  const конец = HTML.indexOf('<!--/СНГ:ДИСЛОКАЦИЯ-->');
  assert.ok(начало >= 0 && конец > начало, 'маркеры СНГ:ДИСЛОКАЦИЯ парные в ·22');
  const блок = HTML.slice(начало, конец);
  const т1 = блок.indexOf('<script>');
  const т2 = блок.lastIndexOf('</script>');
  assert.ok(т1 >= 0 && т2 > т1, 'внутри маркеров есть <script>');
  return блок.slice(т1 + '<script>'.length, т2);
}

/* ── DOM-стаб: один элемент строки + ловушка событий/таймеров ──────── */
function комната() {
  const э = { textContent: '', hidden: true };
  const слушатели = {};
  const таймеры = [];
  const песочница = { console };
  песочница.document = { getElementById: (id) => (id === 'stДислокация' ? э : null) };
  песочница.setInterval = (fn, мс) => { таймеры.push({ fn, мс }); return таймеры.length; };
  песочница.window = песочница; /* в скрипте window.addEventListener / window.SG_ДИСЛОКАЦИЯ */
  песочница.addEventListener = (имя, fn) => { (слушатели[имя] = слушатели[имя] || []).push(fn); };
  песочница.элемент = э;
  песочница.слушатели = слушатели;
  песочница.таймеры = таймеры;
  vm.createContext(песочница);
  vm.runInContext(скриптСтроки(), песочница, { filename: '·22:скрипт-дислокации' });
  return песочница;
}

function замер(сдвигМин, источник) {
  return {
    схема: 1,
    генерация: new Date(Date.now() - (сдвигМин || 0) * 60000).toISOString(),
    источник: источник || 'github-actions',
    релеи: [{ url: 'wss://а', жив: true, мс: 100 }, { url: 'wss://б', жив: false, мс: 50 }, { url: 'wss://в', жив: true, мс: 120 }]
  };
}

test('·22: элемент строки существует и по умолчанию скрыт', () => {
  assert.match(HTML, /id="stДислокация" hidden/, 'строка в разметке честно скрыта по умолчанию');
});

test('строка из замера: живы 2/3, источник CI, возраст «2 мин назад», строка показана', () => {
  const к = комната();
  (к.слушатели['sg-дислокация-готов'] || []).forEach((fn) => fn({ detail: замер(2) }));
  assert.equal(к.элемент.hidden, false, 'замер пришёл — строка показана');
  assert.match(к.элемент.textContent, /релеи живы 2\/3/);
  assert.match(к.элемент.textContent, /github-actions/);
  assert.match(к.элемент.textContent, /замер 2 мин назад/);
  assert.doesNotMatch(к.элемент.textContent, /только что/);
});

test('свежий замер (0 мин) — «только что», не «0 мин назад»', () => {
  const к = комната();
  (к.слушатели['sg-дислокация-готов'] || []).forEach((fn) => fn({ detail: замер(0) }));
  assert.match(к.элемент.textContent, /только что/);
});

test('нет замера — строка молчит (никакого нарисованного «примерного» числа)', () => {
  const к = комната();
  к.таймеры.forEach((т) => т.fn()); /* тик ежеминутного перериса без замера */
  assert.equal(к.элемент.hidden, true, 'строка скрыта');
  assert.equal(к.элемент.textContent, '');
});

test('пустой список релеев в замере — строка не рисуется', () => {
  const к = комната();
  const д = замер(1); д.релеи = [];
  (к.слушатели['sg-дислокация-готов'] || []).forEach((fn) => fn({ detail: д }));
  assert.equal(к.элемент.hidden, true);
});

test('битая генерация не роняет строку (живы 2/3 остались, хвост возраста честно отсутствует)', () => {
  const к = комната();
  const д = замер(2); д.генерация = 'не-дата';
  (к.слушатели['sg-дислокация-готов'] || []).forEach((fn) => fn({ detail: д }));
  assert.equal(к.элемент.hidden, false);
  assert.match(к.элемент.textContent, /релеи живы 2\/3/);
  assert.doesNotMatch(к.элемент.textContent, /замер \d/);
});

test('перерисовка по ежеминутному тику берёт СВЕЖИЙ window.SG_ДИСЛОКАЦИЯ (реальное время)', () => {
  const к = комната();
  assert.equal(к.таймеры.length, 1, 'один ежеминутный перерис');
  assert.equal(к.таймеры[0].мс, 60000);
  к.SG_ДИСЛОКАЦИЯ = замер(7);
  к.таймеры[0].fn();
  assert.match(к.элемент.textContent, /замер 7 мин назад/);
});

/* ── sg-registry.js: замер приносится с cache-buster и живёт в окне ── */
function реестрПесочница() {
  const события = [];
  class CustomEvent {
    constructor(тип, опц) { this.type = тип; this.detail = опц && опц.detail; }
  }
  const песочница = { console, CustomEvent, setTimeout, clearTimeout };
  песочница.window = песочница;
  песочница.dispatchEvent = (е) => события.push(е);
  песочница.addEventListener = () => {};
  песочница.document = {
    querySelector: () => null,
    addEventListener: () => {},
    createElement: () => ({ setAttribute() {}, style: {}, appendChild() {} }),
    head: { appendChild() {} },
    body: undefined
  };
  песочница.navigator = undefined; /* сервис-воркер честно мимо */
  песочница.события = события;
  песочница.setInterval = (fn, мс) => { песочница.интервалМс = мс; return 1; };
  песочница.fetch = (урл) => {
    песочница.фечи = песочница.фечи || [];
    песочница.фечи.push(String(урл));
    if (String(урл).includes('дислокация.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(замер(3)) });
    }
    return Promise.resolve({ ok: false, status: 404 }); /* versions.json ищет выше — все кандидаты мимо */
  };
  vm.createContext(песочница);
  vm.runInContext(readFileSync(join(КОРЕНЬ, 'js', 'sg-registry.js'), 'utf-8'), песочница, { filename: 'js/sg-registry.js' });
  return песочница;
}

test('sg-registry: замер дислокации принесён, событие dispatched, кэш сломан (?t=)', async () => {
  const к = реестрПесочница();
  await new Promise((р) => setTimeout(р, 25)); /* микротаски fetch-цепочек */
  assert.ok(к.SG_ДИСЛОКАЦИЯ, 'window.SG_ДИСЛОКАЦИЯ установлен');
  assert.ok(к.SG_ДИСЛОКАЦИЯ.релеи && к.SG_ДИСЛОКАЦИЯ.релеи.length === 3);
  const дис = к.события.find((е) => е.type === 'sg-дислокация-готов');
  assert.ok(дис, 'событие sg-дислокация-готов dispatched');
  assert.equal(дис.detail, к.SG_ДИСЛОКАЦИЯ);
  const ф = к.фечи.find((у) => у.includes('дислокация.json'));
  assert.match(ф, /\?t=\d+/, 'cache-buster ?t= — CDN не отдаст устаревший замер (грабля 6bdb0cd)');
});

test('sg-registry: режим реального времени — правда перечитывается каждые 5 минут', () => {
  const к = реестрПесочница();
  assert.equal(к.интервалМс, 300000, 'интервал перечитывания 5 минут');
});
