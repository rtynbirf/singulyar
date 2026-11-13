/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ ЛАТКИ ДИСЛОКАЦИЯ (2026-11-11) — ИНСТРУМЕНТЫ/test_зал_код.mjs
   Охраняет: детерминизм кода зала (js/зал-код.js), вшивание в ·18/·22,
   живую дислокацию (sg-registry, воркфлоу, sw15 пре-кэш).
   Запуск: node --test ИНСТРУМЕНТЫ/test_зал_код.mjs
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');

function залкод() {
  const код_файл = readFileSync(join(КОРЕНЬ, 'js', 'зал-код.js'), 'utf-8');
  const песочница = { console };
  песочница.window = песочница;
  vm.createContext(песочница);
  vm.runInContext(код_файл, песочница, { filename: 'js/зал-код.js' });
  return песочница.window.ЗАЛКОД;
}

test('зал-код: кириллица ссылки детерминирована («ТЕСТ1» → TEST1 у всех)', () => {
  const з = залкод();
  assert.equal(з.норм('ТЕСТ1'), 'TEST1');
  assert.equal(з.норм('тест1'), 'TEST1');
  assert.equal(з.норм('тест 1'), 'TEST1');
});

test('зал-код: норм режет до 5 и чистит чужие знаки', () => {
  const з = залкод();
  assert.equal(з.норм('ПРИВЕТ'), 'PRIVE');
  assert.equal(з.норм('ё-ёлка!'), 'EELKA');
  assert.equal(з.норм(''), '');
  assert.equal(з.норм('---'), '');
});

test('зал-код: дет — тот же вход тот же код (5 знаков алфавита дома)', () => {
  const з = залкод();
  const а = з.дет('1');
  const б = з.дет('1');
  assert.equal(а, б);
  assert.match(а, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
  assert.notEqual(з.дет('1'), з.дет('2'));
});

test('зал-код: код() — полный правило: норм ≥4, иначе дет для непустого, иначе фолбэк', () => {
  const з = залкод();
  assert.equal(з.код('ТЕСТ1', () => 'СЛУЧАЙ'), 'TEST1');
  const д1 = з.код('1', () => 'СЛУЧАЙ');
  assert.match(д1, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);   /* непустой вход — детерминированный, НЕ случайный */
  assert.equal(з.код('1', () => 'СЛУЧАЙ'), д1);
  assert.equal(з.код('', () => 'СЛУЧАЙ'), 'СЛУЧАЙ');            /* пусто — фолбэк зала */
  assert.equal(з.код('', ''), '');
});

test('зал-код: транслит совпадает с любым регистром и Ё', () => {
  const з = залкод();
  assert.equal(з.норм('ЁЖИК'), 'EZHIK');
  assert.equal(з.норм('ёжик'), 'EZHIK');
});

test('·22 СВЯЗЬ: зал-код вшит, приглашение в ·22 живо, дислокация на месте', () => {
  const т = readFileSync(join(КОРЕНЬ, 'СИНГУЛЯР_22_СВЯЗЬ.html'), 'utf-8');
  assert.ok(т.includes('<script src="./js/зал-код.js"></script>'), 'скрипт зал-код не вшит в ·22');
  assert.ok(т.includes('window.ЗАЛКОД.код(фиксКод'), 'открытьКанал не на общем правиле');
  assert.ok(т.includes('function ссылкаЗала22'), 'нет приглашения в текущий зал ·22');
  assert.ok(т.includes('id="inLink22"') && т.includes('id="btnLink22"'), 'нет строки ссылки ·22');
  assert.ok(т.includes('id="stДислокация"'), 'нет живой строки дислокации');
  assert.ok(т.includes('SG_ДИСЛОКАЦИЯ'), 'релеи не от живого замера');
  assert.ok(т.includes('Ссылки ниже открывают зал ·18'), 'текст статуса не обновлён');
});

test('·18 СОБЫТИЕ: зал-код вшит во все четыре двери кода', () => {
  const т = readFileSync(join(КОРЕНЬ, 'СИНГУЛЯР_18_СОБЫТИЕ.html'), 'utf-8');
  assert.ok(т.includes('<script src="./js/зал-код.js"></script>'), 'скрипт зал-код не вшит в ·18');
  assert.ok(т.includes('window.ЗАЛКОД.код(фиксКод, кодЗала)'), 'создатьЗал не на общем правиле');
  assert.ok(т.includes('window.ЗАЛКОД.код($(\'joinCode\').value'), 'войтиВЗал не на общем правиле');
  assert.ok(т.includes('window.ЗАЛКОД.код(залКод'), 'ссылка/QR не на общем правиле');
  assert.ok(т.includes('window.ЗАЛКОД.код(п.get(\'хост\')'), 'хост-приглашение не на общем правиле');
  assert.ok(т.includes('SG_ДИСЛОКАЦИЯ'), 'релеи ·18 не от живого замера');
});

test('sg-registry: дислокация читается, правда перечитывается (реальное время)', () => {
  const т = readFileSync(join(КОРЕНЬ, 'js', 'sg-registry.js'), 'utf-8');
  assert.ok(т.includes('sg-дислокация-готов'), 'нет события дислокации');
  assert.ok(т.includes('data/дислокация.json'), 'нет чтения дислокации');
  assert.ok(т.includes('300000'), 'нет 5-минутного перечитывания');
  assert.ok(т.includes("'?t=' + Date.now()"), 'нет cache-buster');
});

test('автомат: воркфлоу Дислокация + замерщик + ветка данных (rumu не трогаем)', () => {
  const вф = readFileSync(join(КОРЕНЬ, '.github/workflows/дислокация.yml'), 'utf-8');
  assert.ok(вф.includes('cron:'), 'нет расписания');
  assert.ok(вф.includes('node ИНСТРУМЕНТЫ/дислокация.mjs'), 'нет запуска замерщика');
  assert.ok(вф.includes('данные-дислокация'), 'замер не идёт в ветку данных');
  assert.ok(вф.includes('pages.yml/dispatches'), 'нет пере-диспатча выкладки');
  assert.ok(!вф.includes('пин_догон'), 'воркфлоу не должен догонять пин (геном заархивирован)');
  const зм = readFileSync(join(КОРЕНЬ, 'ИНСТРУМЕНТЫ/дислокация.mjs'), 'utf-8');
  assert.ok(зм.includes('дислокация.json'), 'замерщик не пишет файл');
  const пж = readFileSync(join(КОРЕНЬ, '.github/workflows/pages.yml'), 'utf-8');
  assert.ok(пж.includes('данные-дислокация'), 'pages.yml не материализует замер');
});

/* латка 2026-11-13 (ход «ПАКЕТ КОЛЛЕГИ: ДВЕРЬ НОЛЬ», догон): мороженое v240 снято
   по закону «протухший оракул умирает» (ТЗ-1, v11.44) — поколение читается из
   реестра; намерение стража сохранено: кэш воркера ≡ реестру (лица ≡ реестру). */
test('sw15: кэш воркера ≡ поколению реестра, зал-код.js в пре-кэше', () => {
  const р = JSON.parse(readFileSync(join(КОРЕНЬ, 'data', 'versions.json'), 'utf-8'));
  const т = readFileSync(join(КОРЕНЬ, 'sw15.js'), 'utf-8');
  assert.ok(т.includes("var S15_CACHE = 's15-orkestrator-" + р.дом.поколение_кэша + "';"), 'кэш воркера ≠ реестру');
  assert.ok(т.includes("'./js/зал-код.js'"), 'зал-код.js не в пре-кэше');
});

test('versions.json: поколение кэша живое (лица ≡ реестру)', () => {
  const р = JSON.parse(readFileSync(join(КОРЕНЬ, 'data', 'versions.json'), 'utf-8'));
  assert.match(р.дом.поколение_кэша, /^v[0-9]+$/);
  /* латка С174: штамп даты '2026-11-11' протух — такт «ПОВЕРКА» идёт датой 2026-11-14;
     закон «протухший оракул умирает» (ТЗ-1, v11.44): дата — формат ISO, факт живёт в реестре */
  assert.match(р.дом.дата, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
});
