/* ─────────────────────────────────────────────────────────────────────────────
   ТЕСТЫ · зеркало-каталога/0.1 (М1 хвост) · такт v11.47 «ЗАКРЫТИЕ» (С125)
   node --test test_зеркало_каталога.mjs
   ───────────────────────────────────────────────────────────────────────────── */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

import { канонизировать, идБлока, построить, сверить, версия } from '../src/зеркало-каталога.mjs';

const К = webcrypto;

test('версия()', () => { assert.equal(версия(), 'зеркало-каталога/0.1'); });

/* ── канонизация ─────────────────────────────────────────────────────────── */
test('канонизация: сортировка ключей рекурсивна', () => {
  assert.equal(канонизировать({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(канонизировать({ z: { y: 1, x: [3, { b: 2, a: 1 }] } }), '{"z":{"x":[3,{"a":1,"b":2}],"y":1}}');
});

/* ── идент блока ─────────────────────────────────────────────────────────── */
test('идБлока: известный SHA-256 пустого и короткой строки', async () => {
  const пустой = await идБлока('', К);
  assert.equal(пустой, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const абв = await идБлока('abc', К);
  assert.equal(абв, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('идБлока: без subtle честный отказ', async () => {
  await assert.rejects(() => идБлока('abc', {}), /crypto\.subtle/);
});

/* ── построение и сверка ─────────────────────────────────────────────────── */
const КАТАЛОГ = [
  { путь: 'index.html', данные: '<html>дом</html>' },
  { путь: 'data/versions.json', данные: '{"версия":"11.47"}' },
  { путь: 'sw15.js', данные: 'var S15_CACHE = "s15-orkestrator-v197";' },
];

test('построить: корень hex, листы отсортированы, размеры честные', async () => {
  const з = await построить(КАТАЛОГ, { крипто: К });
  assert.equal(з.версия, 'зеркало-каталога/0.1');
  assert.match(з.корень, /^[0-9a-f]{64}$/);
  assert.deepEqual(з.листы.map((л) => л.путь), ['data/versions.json', 'index.html', 'sw15.js']);
  assert.equal(з.листы[1].размер, 19); /* «дом» кириллицей = 6 байт UTF-8 */
});

test('построить+сверить: идеальное зеркало верно', async () => {
  const з = await построить(КАТАЛОГ, { крипто: К });
  const в = await сверить(з, КАТАЛОГ.map((ф) => ({ ...ф })), { крипто: К });
  assert.equal(в.верно, true);
  assert.deepEqual(в.битые, []);
  assert.deepEqual(в.нехватает, []);
  assert.deepEqual(в.лишние, []);
});

test('построить: детерминизм — корень стабилен на одинаковых данных', async () => {
  const а = await построить(КАТАЛОГ, { крипто: К });
  const б = await построить(КАТАЛОГ.slice().reverse().map((ф) => ({ ...ф })), { крипто: К });
  assert.equal(а.корень, б.корень); /* порядок подачи не влияет — листы сортируются */
  assert.equal(JSON.stringify(а.листы), JSON.stringify(б.листы));
});

test('сверить: битый байт → битые, верно=false, без throw', async () => {
  const з = await построить(КАТАЛОГ, { крипто: К });
  const поцарапанный = КАТАЛОГ.map((ф) => ({ ...ф }));
  поцарапанный[0] = { путь: 'index.html', данные: '<html>дом2</html>' };
  const в = await сверить(з, поцарапанный, { крипто: К });
  assert.equal(в.верно, false);
  assert.deepEqual(в.битые, ['index.html']);
});

test('сверить: убрали файл → нехватает; добавили → лишние', async () => {
  const з = await построить(КАТАЛОГ, { крипто: К });
  const в1 = await сверить(з, [КАТАЛОГ[0]], { крипто: К });
  assert.deepEqual(в1.нехватает.sort(), ['data/versions.json', 'sw15.js']);
  assert.equal(в1.верно, false);
  const в2 = await сверить(з, [...КАТАЛОГ, { путь: 'новый.txt', данные: 'лишний' }], { крипто: К });
  assert.deepEqual(в2.лишние, ['новый.txt']);
});

test('сверить: размер не совпал → битые', async () => {
  const з = await построить(КАТАЛОГ, { крипто: К });
  const в = await сверить(з, [{ путь: 'index.html', данные: 'короткий' }], { крипто: К });
  assert.deepEqual(в.битые, ['index.html']);
});

test('построить: дубликат пути — RangeError; пустой каталог — RangeError', async () => {
  await assert.rejects(() => построить([{ путь: 'а', данные: '1' }, { путь: 'а', данные: '2' }], { крипто: К }), RangeError);
  await assert.rejects(() => построить([], { крипто: К }), RangeError);
});

test('построить: отказы входа', async () => {
  await assert.rejects(() => построить('мусор', { крипто: К }), TypeError);
  await assert.rejects(() => построить([{ путь: '', данные: '1' }], { крипто: К }), TypeError);
  await assert.rejects(() => построить([{ путь: 'а', данные: 42 }], { крипто: К }), TypeError);
  await assert.rejects(() => построить(КАТАЛОГ, { крипто: К, размерБлока: 0 }), RangeError);
});

test('построить: без subtle честный отказ', async () => {
  await assert.rejects(() => построить(КАТАЛОГ, { крипто: {} }), /crypto\.subtle/);
});

test('немутация входа', async () => {
  const файлы = КАТАЛОГ.map((ф) => ({ ...ф }));
  const копия = JSON.stringify(файлы);
  await построить(файлы, { крипто: К });
  assert.equal(JSON.stringify(файлы), копия);
});

test('чанки: размерБлока 4 — много блоков, сверка точна', async () => {
  const большой = { путь: 'большой.bin', данные: 'x'.repeat(35) };
  const з = await построить([большой], { крипто: К, размерБлока: 4 });
  assert.equal(з.листы[0].блоки.length, 9); /* 35/4 = 8.75 → 9 чанков */
  const в = await сверить(з, [{ ...большой }], { крипто: К, размерБлока: 4 });
  assert.equal(в.верно, true);
  const в2 = await сверить(з, [{ путь: 'большой.bin', данные: 'x'.repeat(34) + 'y' }], { крипто: К, размерБлока: 4 });
  assert.deepEqual(в2.битые, ['большой.bin']);
});

/* ── Порт ≡ канон (vm) ───────────────────────────────────────────────────── */
test('порт mirror-core.js ≡ канон', async () => {
  const кодПорта = await readFile(join(dirname(fileURLToPath(import.meta.url)), '../../../../js/mirror-core.js'), 'utf8');
  const песочница = { window: {}, console, crypto: webcrypto, TextEncoder };
  vm.createContext(песочница);
  vm.runInContext(кодПорта, песочница, { filename: '../../../../js/mirror-core.js' });
  const порт = песочница.window.__ЗЕРКАЛО;
  assert.ok(порт, 'порт не поставил __ЗЕРКАЛО');

  assert.equal(await порт.идБлока('abc'), await идБлока('abc', К));
  const зКан = await построить(КАТАЛОГ, { крипто: К });
  const зПор = await порт.построить(КАТАЛОГ.map((ф) => ({ ...ф })));
  assert.equal(зПор.корень, зКан.корень);
  assert.equal(JSON.stringify(зПор.листы), JSON.stringify(зКан.листы));
  const вПор = await порт.сверить(зПор, КАТАЛОГ.map((ф) => ({ ...ф })));
  assert.equal(вПор.верно, true);
  const битое = await порт.сверить(зПор, [{ путь: 'index.html', данные: 'другое' }]);
  assert.equal(JSON.stringify(битое.битые), JSON.stringify(['index.html'])); /* vm-реалм: сравнение по JSON */
  // отказы: имя+сообщение
  let оКан = null, оПор = null;
  try { await построить([], { крипто: К }); } catch (е) { оКан = е; }
  try { await порт.построить([]); } catch (е) { оПор = е; }
  assert.ok(оКан && оПор);
  assert.equal(оПор.message, оКан.message);
});
