/* Тест логики ·20 ФОНЕТИКА (без DOM): синтаксис скрипта, ядро из маркеров,
   романизация/прогоны/фишки/языки/фильтр моста/выбор голоса — против бандла any-ascii из БИБЛИОТЕКИ/.
   Запуск: node ИНСТРУМЕНТЫ/test_s20_logic.js   (из корня репо или откуда угодно) */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const РЕПО = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(РЕПО, 'СИНГУЛЯР_20_ФОНЕТИКА.html'), 'utf8');

let fails = 0;
const check = (name, cond, extra) => {
  console.log(name + ':', cond ? 'OK' : 'FAIL' + (extra ? ' | ' + extra : ''));
  if (!cond) fails++;
};

/* 1. синтаксис всего скрипта модуля */
/* v1.42.0: КОРД вшит первым — синтаксису сдаём ВСЕ inline-скрипты страницы */
const блоки = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]);
check('script block найден', блоки.length > 0);
if (!блоки.length) process.exit(1);
const js = блоки.join('\n;\n');
const tmp = path.join(require('os').tmpdir(), 's20_full_' + process.pid + '.js');
fs.writeFileSync(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp]); check('синтаксис модуля', true); }
catch (e) { check('синтаксис модуля', false, String(e.stderr)); process.exit(1); }

/* 2. ядро из маркеров */
const mCore = js.match(/\/\* ── S20_CORE_START ── \*\/([\s\S]*?)\/\* ── S20_CORE_END ── \*\//);
check('маркеры ядра', !!mCore);
if (!mCore) process.exit(1);
const corePath = path.join(require('os').tmpdir(), 's20_core_' + process.pid + '.js');
fs.writeFileSync(corePath, mCore[1] + '\nmodule.exports = S20;');

/* 3. бандл any-ascii из репо (ESM) */
import(path.join(РЕПО, 'БИБЛИОТЕКИ', 'any-ascii.bundle.mjs')).then((м) => {
  const anyAscii = м.default;
  check('бандл any-ascii экспортирует функцию', typeof anyAscii === 'function');
  const S20 = require(corePath);
  check('ядро экспортировано', !!S20 && typeof S20.романизировать === 'function');
  main(anyAscii, S20);
}).catch((e) => { check('бандл any-ascii загружается', false, e.message); process.exit(1); });

function main(anyAscii, S20) {

/* романизация прогонов */
check('roma.ru', S20.романизировать('Когда теряем', anyAscii) === 'Kogda teryaem', S20.романизировать('Когда теряем', anyAscii));
check('roma.zh', S20.романизировать('当我们失去彼此', anyAscii) === 'dang wo men shi qu bi ci', S20.романизировать('当我们失去彼此', anyAscii));
check('roma.ja', S20.романизировать('こんにちは', anyAscii) === 'konnichiha', S20.романизировать('こんにちは', anyAscii));
check('roma.ko', S20.романизировать('한국어', anyAscii) === 'han gug eo', S20.романизировать('한국어', anyAscii));
check('roma.kana+han пробел на стыке', S20.романизировать('こんにちは世界', anyAscii) === 'konnichiha shi jie', S20.романизировать('こんにちは世界', anyAscii));
check('roma.han+kana пробел на стыке', S20.романизировать('東京タワー', anyAscii) === 'dong jing tawa', S20.романизировать('東京タワー', anyAscii));
check('roma.hangul слоги', S20.романизировать('우리가 잃을 때', anyAscii) === 'u li ga ilh eul ttae', S20.романизировать('우ри가 잃을 때', anyAscii));
check('roma.lat+han', S20.романизировать('UltraStar東京', anyAscii) === 'UltraStar dong jing', S20.романизировать('UltraStar東京', anyAscii));
check('roma.han+lat', S20.романизировать('私UltraStar', anyAscii) === 'si UltraStar', S20.романизировать('私UltraStar', anyAscii));
check('roma.empty', S20.романизировать('', anyAscii) === '');
check('roma.nullsafe', S20.романизировать(null, anyAscii) === '');

/* прогоны */
const пр = S20.прогоны('私たち');
check('runs.han→kana', пр.length === 2 && пр[0].к === 'han' && пр[0].с === '私' && пр[1].к === 'kana' && пр[1].с === 'たち', JSON.stringify(пр));
const пр2 = S20.прогоны('Когда');
check('runs.cyrillic=other', пр2.length === 1 && пр2[0].к === 'other');

/* фишки */
const ф1 = S20.фишки('当我们', anyAscii);
check('chips.han по слогам', ф1.length === 3 && ф1[0].р === 'dang' && ф1[1].р === 'wo' && ф1[2].р === 'men', JSON.stringify(ф1));
const ф2 = S20.фишки('きゃっ', anyAscii);
check('chips.kana малые слиты', ф2.length === 1 && ф2[0].о === 'きゃっ', JSON.stringify(ф2));
const ф3 = S20.фишки('Когда теряем', anyAscii);
check('chips.cyrillic по словам', ф3.length === 2 && ф3[0].о === 'Когда' && ф3[1].о === 'теряем' && ф3[1].р === 'teryaem', JSON.stringify(ф3));
const ф4 = S20.фишки('우리가', anyAscii);
check('chips.hangul по слогам', ф4.length === 3 && ф4[0].р === 'u' && ф4[1].р === 'li' && ф4[2].р === 'ga', JSON.stringify(ф4));
const ф5 = S20.фишки('  Когда   теряем  ', anyAscii);
check('chips.пробелы схлопнуты', ф5.length === 2 && ф5.every((f) => !/\s/.test(f.о)), JSON.stringify(ф5));

/* языки */
check('lang.ru', S20.языкТекста('Когда теряем').язык === 'ru');
check('lang.uk по ї', S20.языкТекста('Україна має').язык === 'uk');
check('lang.be по ў', S20.языкТекста('Беларусь, ў добрай').язык === 'be');
check('lang.sr по ћ', S20.языкТекста('Србија, ће бити').язык === 'sr');
check('lang.zh', S20.языкТекста('当我们失去').язык === 'zh');
check('lang.ja кана преобладает', S20.языкТекста('私たちが失うとき').язык === 'ja');
check('lang.ko', S20.языкТекста('우리가 잃을').язык === 'ko');
check('lang.hi', S20.языкТекста('जब हम खोते').язык === 'hi');
check('lang.ar', S20.языкТекста('عندما نفقد').язык === 'ar');
check('lang.el', S20.языкТекста('Όταν χάνουμε').язык === 'el');
check('lang.th', S20.языкТекста('เมื่อเราสูญเสีย').язык === 'th');
check('lang.he', S20.языкТекста('כשאנחנו מאבדים').язык === 'he');
check('lang.hy', S20.языкТекста('Հայերեն այբուբեն').язык === 'hy');
check('lang.ka', S20.языкТекста('ქართული ენა').язык === 'ka');
check('lang.am', S20.языкТекста('አማርኛ ፊደል').язык === 'am');
check('lang.latin → null', S20.языкТекста('When we lose each other').язык === null);
check('lang.empty → null', S20.языкТекста('').язык === null);

/* фильтр моста ·16 */
const ок = { ver: 1, t: 'STATE', src: 'stage-abc', seq: 5, ts: 1, d: { song: 'X', word: 'мы', next: ['теряем'], notes: [], pos: 1 } };
check('bridge.STATE ·16 ок', S20.фильтрМоста(ок) === true);
check('bridge без word — долой', S20.фильтрМоста({ ...ок, d: { song: 'X', next: [] } }) === false);
check('bridge без next — долой', S20.фильтрМоста({ ...ок, d: { song: 'X', word: 'мы' } }) === false);
check('bridge.CMD игнор', S20.фильтрМоста({ ver: 1, t: 'CMD', src: 'x', d: {} }) === false);
check('bridge.HELLO игнор', S20.фильтрМоста({ ver: 1, t: 'HELLO', src: 'x', role: 'stage' }) === false);
check('bridge.ver ≠ 1 — долой', S20.фильтрМоста({ ...ок, ver: 2 }) === false);
check('bridge без src — долой', S20.фильтрМоста({ ver: 1, t: 'STATE', d: { word: 'a', next: [] } }) === false);
check('bridge.null не падает', S20.фильтрМоста(null) === false);
check('bridge.uptime не падает', S20.фильтрМоста({ get ver() { throw new Error('x'); } }) === false);

/* выбор голоса */
const голоса = [
  { lang: 'en-US', name: 'A' },
  { lang: 'ru-RU', name: 'Milena' },
  { lang: 'zh_CN', name: 'Ting' }
];
check('voice.exact', S20.выбратьГолос(голоса, 'ru-RU').name === 'Milena');
check('voice.prefix', S20.выбратьГолос(голоса, 'ru').name === 'Milena');
check('voice.underscore в данных', S20.выбратьГолос(голоса, 'zh-CN').name === 'Ting');
check('voice.miss → null', S20.выбратьГолос(голоса, 'ja') === null);
check('voice.пусто → null', S20.выбратьГолос([], 'ru') === null);
check('voice.без языка → null', S20.выбратьГолос(голоса, '') === null);

/* капитальный сплит — конкретные регрессии */
check('split.Ttae', S20.сплитКапс('Ttae').join(' ') === 'ttae');
check('split.AnNyeong', S20.сплитКапс('AnNyeongHaSeYo').join(' ') === 'an nyeong ha se yo');
check('split.DongJing', S20.сплитКапс('DongJing').join(' ') === 'dong jing');

fs.unlinkSync(tmp); fs.unlinkSync(corePath);
console.log(fails === 0 ? 'ALL LOGIC OK' : fails + ' FAILURES');
process.exit(fails ? 1 : 0);
}
