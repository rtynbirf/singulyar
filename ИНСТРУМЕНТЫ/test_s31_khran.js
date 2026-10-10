#!/usr/bin/env node
/* Испытание S-04 «ХРАН» (storage.persist) — такт v10.51 «ЯЗЫКИ» (С32; ре-посадка СКЛАД).
   Каркас — домовой стиль test_modules_logic.js: vm + минимальный window/document.
   10 инвариантов ТЗ S-04 §5. node test_s31_khran.js → 0 = зелёный.
   (Проба 19 занята ШИЛКОЙ коллег v10.48 — ХРАН идёт в 20.) */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = path.join(__dirname, '..', 'СИНГУЛЯР_31_ЛАДОМ.html');
const src = fs.readFileSync(HTML, 'utf8');

/* ── вырезка блока СКЛАД ── */
const ОТКР = '<script id="skladScript">';
const a = src.indexOf(ОТКР), b = src.indexOf('</script>', a);
if (a < 0 || b < 0) { console.error('БЛОК СКЛАД не найден'); process.exit(1); }
const БЛОК = src.slice(a + ОТКР.length, b);
if (БЛОК.indexOf('indexedDB.open("s31-склад", 1)') < 0 || БЛОК.indexOf('S-04 · ХРАН') < 0) {
  console.error('в вырезке нет склада/ХРАН'); process.exit(1);
}

/* ── моки ── */
function мокLS() {
  const м = {};
  return { getItem: k => (k in м ? м[k] : null), setItem: (k, v) => { м[k] = String(v); },
    removeItem: k => { delete м[k]; }, clear: () => { for (const k in м) delete м[k]; } };
}
function мокIDB() {
  function Запрос(рез) { const q = { onsuccess: null, onerror: null };
    queueMicrotask(() => { if (q.onsuccess) q.onsuccess({ target: { result: рез } }); }); return q; }
  return {
    open() { const q = { onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null };
      queueMicrotask(() => { const db = {
          objectStoreNames: { contains: () => true },
          transaction(st, режим) { return { objectStore() { return {
            put(знач, ключ) { return Запрос(ключ); }, get() { return Запрос(null); } }; } }; } };
        if (q.onupgradeneeded) q.onupgradeneeded({ target: { result: db } });
        if (q.onsuccess) q.onsuccess({ target: { result: db } }); });
      return q; }
  };
}
const тик = () => new Promise(r => setImmediate(r));

function собрать({ storage, persisted, idb } = {}) {
  const nav = {};
  if (storage !== 'нет') {
    nav.storage = { __счёт: 0, __реш: storage === undefined ? true : storage,
      persist() { this.__счёт++; return Promise.resolve(this.__реш); },
      persisted() { return Promise.resolve(persisted === true); } };
    if (storage === false) nav.storage.persist = function() { this.__счёт++; return Promise.resolve(false); };
    if (storage === 'reject') nav.storage.persist = function() { this.__счёт++; return Promise.reject(new Error('x')); };
  }
  const тосты = [];
  const s = { window: null, document: { getElementById: () => null, addEventListener: () => {} },
    navigator: nav, localStorage: мокLS(),
    indexedDB: idb === false ? undefined : мокIDB(),
    __KV: { showToast: t => тосты.push(t) },
    console, setTimeout, clearTimeout, setImmediate };
  s.window = s;
  vm.createContext(s);
  vm.runInContext(БЛОК, s, { filename: 'sklad.js' });
  s.__тосты = тосты;
  return s;
}

let ГОД = 0, ПАЛ = 0;
function ок(имя, честно) {
  if (честно) { ГОД++; console.log('  ✓ ' + имя); }
  else { ПАЛ++; console.log('  ✗ ' + имя); }
}

(async function main() {
  /* 1. экспорт и гарды: нет API → честный статус, без throw */
  {
    const s = собрать({ storage: 'нет' });
    await s.__СКЛАД.готов; await тик(); await тик();
    ок('1a. __СКЛАД.ver === v10.16', s.__СКЛАД.ver === 'v10.16');
    ок('1b. typeof window.__ХРАН === object', typeof s.window.__ХРАН === 'object');
    ок('1c. нет API → "нет API в этом браузере"', s.window.__ХРАН.статус().закреплено === 'нет API в этом браузере');
  }

  /* 2. ленивость: старт не просит persist */
  {
    const s = собрать({ persisted: false });
    await s.__СКЛАД.готов; await тик(); await тик();
    ок('2. старт (готов+хранПроверь) persist не звал', s.window.navigator.storage.__счёт === 0);
  }

  /* 3. первый импорт в библиотеку → persist ровно 1; повторная → по-прежнему 1 */
  {
    const s = собрать({ persisted: false });
    await s.__СКЛАД.готов; await тик();
    await s.__СКЛАД.библиотека.клади('тест-v1049', { a: 1 }); await тик(); await тик();
    const раз = s.window.navigator.storage.__счёт;
    await s.__СКЛАД.библиотека.клади('тест-v1049b', { b: 2 }); await тик(); await тик();
    ок('3. импорт просит persist один раз', раз === 1 && s.window.navigator.storage.__счёт === 1);
  }

  /* 4. тихие prefs не просят: 10× пиши → persist 0 */
  {
    const s = собрать({ persisted: false });
    await s.__СКЛАД.готов; await тик();
    for (let i = 0; i < 10; i++) s.__СКЛАД.пиши('ключ' + i, i);
    await тик(); await тик();
    ок('4. 10× пиши — persist не звался', s.window.navigator.storage.__счёт === 0);
  }

  /* 5. отказ браузера: статус + один тост за жизнь сессии + флаг в доке */
  {
    const s = собрать({ storage: false, persisted: false });
    await s.__СКЛАД.готов; await тик();
    await s.__СКЛАД.библиотека.клади('тест', { x: 1 }); await тик(); await тик();
    ок('5a. отказ → "отказ браузера"', s.window.__ХРАН.статус().закреплено === 'отказ браузера');
    ок('5b. тост показан ровно 1', s.__тосты.length === 1);
    ок('5c. флаг тоста в доке', s.__СКЛАД.читай('s31.хранилище.тост') === true);
    await s.__СКЛАД.библиотека.клади('тест2', { y: 2 }); await тик(); await тик();
    ок('5d. второй импорт — тоста больше нет', s.__тосты.length === 1);
  }

  /* 6. исключение из persist → "ошибка запроса", дом жив, проба не бросает */
  {
    const s = собрать({ storage: 'reject', persisted: false });
    await s.__СКЛАД.готов; await тик();
    await s.__СКЛАД.библиотека.клади('тест', { x: 1 }); await тик(); await тик();
    ок('6a. reject → "ошибка запроса"', s.window.__ХРАН.статус().закреплено === 'ошибка запроса');
    let проба = null;
    try { проба = s.window.__HEALTH21(); } catch (e) { }
    ок('6b. проба 20 не бросает и даёт warn-строку',
      Array.isArray(проба) && проба.length === 1 && проба[0].warn === true && проба[0].ok === false);
  }

  /* 7. persisted=true на старте → "закреплено", тост никогда */
  {
    const s = собрать({ persisted: true });
    await s.__СКЛАД.готов; await тик(); await тик();
    ок('7. браузер уже закрепил → "закреплено", без тостов',
      s.window.__ХРАН.статус().закреплено === 'закреплено' && s.__тосты.length === 0);
  }

  /* 8. проба 20: форма и гарды */
  {
    const s = собрать({ persisted: true });
    await s.__СКЛАД.готов; await тик(); await тик();
    let р = null; try { р = s.window.__HEALTH21(); } catch (e) { }
    ок('8a. проба: массив 1, sec:"R", ok=true',
      Array.isArray(р) && р.length === 1 && р[0].sec === 'R' && р[0].ok === true);
    const было = s.window.__ХРАН; s.window.__ХРАН = undefined;
    let р2 = null; let пал = false;
    try { р2 = s.window.__HEALTH21(); } catch (e) { пал = true; }
    ок('8b. без __ХРАН проба не бросает, warn: "склад не поднялся"',
      !пал && р2[0].warn === true && String(р2[0].n).indexOf('склад не поднялся') >= 0);
    s.window.__ХРАН = было;
  }

  /* 9. регистрация (статика исходника) */
  ок('9a. реестр проб зовёт __HEALTH21 (и следующие за ней)',
    /window\.__HEALTH20,window\.__HEALTH21(,window\.__HEALTH\d+)*\]\.forEach/.test(src));
  ок('9b. казначей ведёт __ХРАН (семья «сканер·склад»)',
    /сканер·склад",\s+\/\^__SCAN\|\^__IMPORT\$\|\^__POS\$\|\^__REC\$\|\^__СКЛАД\$\|\^__ХРАН\$\//.test(src));

  /* 10. канон не тронут */
  ок('10a. indexedDB.open("s31-склад", 1) — ровно 1',
    (src.match(/indexedDB\.open\("s31-склад", 1\)/g) || []).length === 1);
  ок('10b. ключ s31.prefs.v2 на месте', src.indexOf('var LSK = "s31.prefs.v2"') >= 0);
  ок('10c. россыпь миграций цела (5 ключей)',
    ['s31.l4.v1', 's31.l4.chords.v1', 's31.l4.auto.v1', 's31.dict.v1', 'kv12.tab']
      .every(k => src.indexOf('"' + k + '"') >= 0));

  console.log(`\nИТОГ: ${ГОД} ✓ / ${ПАЛ} ✗`);
  process.exit(ПАЛ ? 1 : 0);
})().catch(e => { console.error('СБОР: ' + (e && e.stack || e)); process.exit(2); });
