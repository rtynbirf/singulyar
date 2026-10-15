// test_zakon_yazykov.mjs — ЗАКОН ЯЗЫКОВ (I-12 СВОДа), такт v10.90 «ЗАКОН» (С65).
// Запуск: node --test ИНСТРУМЕНТЫ/test_zakon_yazykov.mjs
// Доказательство закона: канон ДАННЫЕ/ПОРЯДОК_ЯЗЫКОВ.json и его инварианты,
// сквозная сверка с ЗАКОН_ПОРЯДОК зала ·31 (СИНГУЛЯР_31_ЛАДОМ.html).
//
// Закон (владелец, 2026-10-13 — «эТО ЗАКОН!!!»):
//   1. РУССКИЙ  2. СЕРБСКИЙ (всегда)  3. КАЗАХСКИЙ (всегда)  4. НЕМЕЦКИЙ (всегда)
//   5. 15 языков СССР (конституционный порядок союзных республик)
//   6. все языки народов СССР
//   7. все языки по количеству носителей — от большего к меньшему.
// Порядок печёный: машина не пересортировывает.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const T = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const канон = JSON.parse(readFileSync(path.join(T, 'ДАННЫЕ', 'ПОРЯДОК_ЯЗЫКОВ.json'), 'utf8'));
const зал = readFileSync(path.join(T, 'СИНГУЛЯР_31_ЛАДОМ.html'), 'utf8');

const ПЕРВЫЕ = ['ru', 'sr', 'kk', 'de'];
const СССР15 = ['ru', 'uk', 'be', 'uz', 'kk', 'ka', 'az', 'lt', 'mo', 'lv', 'ky', 'tg', 'hy', 'tk', 'et']; /* v10.91: ремонт — hy (армянский), не am (амхарский) */
const ссср_остаток = СССР15.filter(c => !ПЕРВЫЕ.includes(c));

// --- 1. Канон: паспорт и зоны ---
assert.equal(канон.документ.includes('ПОРЯДОК ЯЗЫКОВ'), true, 'канон назван');
assert.ok(канон.закон.includes('РУССКИЙ') && канон.закон.includes('СЕРБСКИЙ') && канон.закон.includes('КАЗАХСКИЙ') && канон.закон.includes('НЕМЕЦКИЙ'), 'закон назван четырьмя языками');
assert.deepEqual(канон.зоны.первые_четыре.порядок, ПЕРВЫЕ, 'первые четыре: РУС→СРБ→КАЗ→НЕМ');
assert.deepEqual(канон.зоны.ссср_15_республик.порядок, СССР15, 'СССР-15 — конституционный порядок');

// --- 2. Порядок зала: инварианты закона ---
const п = канон.порядок_ладом;
assert.ok(Array.isArray(п) && п.length >= 100, 'порядок зала полон');
assert.deepEqual(п.slice(0, 4), ПЕРВЫЕ, 'зал: первые четыре — закон владельца');
assert.equal(new Set(п).size, п.length, 'зал: без повторов');

// СССР-блок стоит перед всем хвостом
const инд = Object.fromEntries(п.map((c, i) => [c, i]));
const максСССР = Math.max(...ссср_остаток.filter(c => c in инд).map(c => инд[c]));
const хвостовыеПервые = ['es', 'en', 'pt', 'fr', 'it', 'pl'].filter(c => c in инд);
const минХвост = Math.min(...хвостовыеПервые.map(c => инд[c]));
assert.ok(максСССР < минХвост, 'зал: все СССР-коды раньше хвоста по носителям');

// хвост — по убыванию носителей (ничьи допустимы)
const нос = канон.носители;
let последний = Infinity;
for (let i = минХвост; i < п.length; i++) {
  const з = нос[п[i]] ?? 0;
  assert.ok(з <= последний, `зал: хвост по убыванию носителей — сбой на ${п[i]}`);
  последний = з;
}

// --- 3. Сквозная сверка: канон == ЗАКОН_ПОРЯДОК зала (байт-в-байт) ---
const старт = зал.indexOf('const ЗАКОН_ПОРЯДОК = [');
assert.ok(старт > 0, 'зал: ЗАКОН_ПОРЯДОК найден');
const конец = зал.indexOf(']', старт);
const массив = зал.slice(старт, конец + 1);
const коды = [...массив.matchAll(/"([A-Za-z_][A-Za-z_0-9-]*)"/g)].map(m => m[1]);
assert.deepEqual(коды, п, 'зал: ЗАКОН_ПОРЯДОК байт-в-байт равен канону');

// --- 4. Селект автоперевода зала — по закону ---
const selStart = зал.indexOf("l4selTl");
assert.ok(selStart > 0, 'зал: селект автоперевода найден');
const кусок = зал.slice(selStart, selStart + 3000);
const опции = [...кусок.matchAll(/<option value="([a-z]{2})">/g)].map(m => m[1]);
assert.ok(опции.length >= 15, 'селект: все опции на месте');
assert.deepEqual(опции.slice(0, 5), ['ru', 'sr', 'kk', 'de', 'uk'], 'селект: РУС→СРБ→КАЗ→DEU→УКР (закон)');
const п5 = опции.slice(5);
const ожидаемыйХвост = [...п5].sort((a, b) => (нос[b] ?? 0) - (нос[a] ?? 0));
assert.deepEqual(п5, ожидаемыйХвост, 'селект: хвост по убыванию носителей');


// --- 5. Флагман «Когда теряем» — порядок по закону (v10.91 «ПОРЯДОК») ---
const флагман = readFileSync(path.join(T, 'СИНГУЛЯР_01_Когда_теряем_157_голосов.html'), 'utf8');
const пф = канон.порядок_флагман;
assert.ok(Array.isArray(пф) && пф.length === 157, 'флагман: канон порядка — 157 кодов');
assert.deepEqual(пф.slice(0, 5), ['ru-orig', 'ru', 'sr', 'kk', 'de'], 'флагман: РУС-ориг+РУС → СРБ → КАЗ → НЕМ');
assert.equal(new Set(пф).size, пф.length, 'флагман: без повторов');
const индФ = Object.fromEntries(пф.map((c, i) => [c, i]));
const сссрФ = ['uk', 'be', 'uz', 'ka', 'az', 'lt', 'lv', 'ky', 'tg', 'hy', 'tk', 'et'].filter(c => c in индФ);
const нарФ = ['ba', 'os', 'tt', 'ug', 'yi'].filter(c => c in индФ);
const хвФ = ['es', 'en', 'pt', 'fr', 'it', 'pl'].filter(c => c in индФ);
assert.ok(Math.max(...сссрФ.map(c => индФ[c])) < Math.min(...нарФ.map(c => индФ[c])), 'флагман: СССР-15 перед народами СССР');
assert.ok(Math.max(...нарФ.map(c => индФ[c])) < Math.min(...хвФ.map(c => индФ[c])), 'флагман: народы СССР перед хвостом');
const стФ = флагман.indexOf('const ЗАКОН_ПОРЯДОК=[');
assert.ok(стФ > 0, 'флагман: ЗАКОН_ПОРЯДОК найден');
const кнФ = флагман.indexOf(']', стФ);
const кодыФ = [...флагман.slice(стФ, кнФ + 1).matchAll(/"([A-Za-z_-]+)"/g)].map(m => m[1]);
assert.deepEqual(кодыФ, пф, 'флагман: массив байт-в-байт равен канону');
const стЛ = флагман.indexOf('const LANGS={');
const ключи = [...флагман.slice(стЛ).matchAll(/"([a-z][a-zA-Z_-]{1,9})":\{"n":"/g)].map(m => m[1]);
assert.equal(ключи.length, 157, 'флагман: 157 ключей LANGS');
assert.deepEqual(ключи, пф, 'флагман: ключи LANGS по закону');
assert.ok(флагман.includes('ЗАКОН_ПОРЯДОК.indexOf(a)'), 'флагман: сортировка только по печёному массиву');
assert.ok(!флагман.includes('const FEATURED') && !флагман.includes('FEATURED.indexOf'), 'флагман: FEATURED снят из кода (нарушал закон)');

console.log(`ЗАКОН ЯЗЫКОВ (I-12): канон ${п.length} + флагман ${пф.length} кодов, СССР-15 (hy!) перед хвостом, хвост по носителям — всё сходится`);

