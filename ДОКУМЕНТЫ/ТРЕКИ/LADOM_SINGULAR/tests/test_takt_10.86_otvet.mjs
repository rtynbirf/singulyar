// test_takt_10.86_otvet.mjs — такт v10.86 «ОТВЕТ» (С61): байт-стражи.
// Проверяет: вердикты по SECURITY.md коллеги, DOM-экран таймлайна, прототипы
// коллеги байт-в-байт (sha256), цех 10.86/v141/летопись 74.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const T = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
let ok = 0, all = 0;
function t(name, cond) {
  all++;
  if (cond) { ok++; console.log('  ✓ ' + name); }
  else console.log('  ✗ ' + name);
}
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const дом = readFileSync(path.join(T, 'СИНГУЛЯР_31_ЛАДОМ.html'), 'utf8');

console.log('такт v10.86 «ОТВЕТ» — байт-стражи дома и прототипов');

// А. Вердикты SECURITY.md — дом
t('01 дом: eval() = 0 (претензия №2 опровергнута)', !/\beval\(/.test(дом));
t('02 дом: таймлайн каталога без raw-конкатенации s.n', !дом.includes('d.innerHTML = "<span>"+s.n+"</span>"'));
t('03 дом: пересобратьТаймлайн без raw-конкатенации sec.n', !дом.includes('d.innerHTML = "<span>"+sec.n+"</span>"'));
t('04 дом: DOM-экран секций на месте (guard=v1085 ×2)', (дом.match(/guard=v1085/g) || []).length === 2);
t('05 дом: CSP-стражи постура А целы', ["'unsafe-inline'", "'wasm-unsafe-eval'", 'blob:', 'cdn.jsdelivr.net', "object-src 'none'"].every(s => дом.includes(s)));
t('06 дом: строки песни — textContent (путь жильца закрыт)', (дом.match(/\.textContent = c\.t;/g) || []).length >= 2);
t('07 дом: титул v10.86 «ОТВЕТ»', дом.includes('v10.86 «ОТВЕТ»'));
t('08 дом: window.APP — живая правда v10.91 «СВОИ»/v147 (факты append-only в летописи)', /window\.APP = \{ v:'10\.91', такт:'СВОИ', кэш:'s15-orkestrator-v147'/.test(дом));

// Б. Прототипы коллеги — приняты байт-в-байт
const V2 = ['index.html','css/main.css','js/app.js','js/state.js','js/lyrics-engine.js','data/song.js','README.md','SECURITY.md'];
t('09 ladom-v2: 8 файлов на месте', V2.every(f => existsSync(path.join(T, 'ladom-v2', f))));
const v2code = readFileSync(path.join(T, 'ladom-v2/js/app.js'), 'utf8') + readFileSync(path.join(T, 'ladom-v2/js/lyrics-engine.js'), 'utf8') + readFileSync(path.join(T, 'ladom-v2/js/state.js'), 'utf8');
t('10 ladom-v2: eval = 0', !/\beval\(/.test(v2code));
t('11 ladom-v2: innerHTML = 0', !v2code.includes('.innerHTML'));
const P1 = ['index.html','css/styles.css','js/main.js','data/lyrics.js','README.md'];
t('12 ladom-prototype: 5 файлов на месте', P1.every(f => existsSync(path.join(T, 'ladom-prototype', f))));
const HASHES = {
  "ladom-prototype/README.md": "cb271cef2bef8ffb36bb05d2d2b4895c378631b0252ee17b5fd3e188d634483f",
  "ladom-prototype/css/styles.css": "a24473547d9b261e81ce89c22d99803871515b90563c38a470b8bdaa9547e7e0",
  "ladom-prototype/data/lyrics.js": "573aa236680eebf78d4ba026c4d64bf1047684008cc9ee95b74daa73ba169f0d",
  "ladom-prototype/index.html": "83d7e0561a8e4f5e2b582f91889a776530023b3b0ec61906db15e1da4947673d",
  "ladom-prototype/js/main.js": "4a4b62cdb4062255043bad69607f48a2d397098b51283c82c1210ebb87d1d6f8",
  "ladom-v2/README.md": "74388281bc65ee0284559798a6a7b4e890bd3cf25756169bf3312d4c562d7bb7",
  "ladom-v2/SECURITY.md": "9a4b27dbde643c13b56af9b7dceffd1404231ceb75be370f5fe64a8f919d938e",
  "ladom-v2/css/main.css": "e4edb75bde5923428aaa45d7e534afbb3107ae13a88e8ae8695c7cbffe91fb51",
  "ladom-v2/data/song.js": "83eb090e52631a7113bfae9f1db41b7001103dc8e991b22f1d4bf528a6fb9616",
  "ladom-v2/index.html": "a5bb4a251ac782c273b79ae8332a73adf3afb003cb36ec068ac9dc5914a3cea9",
  "ladom-v2/js/app.js": "1ccdcb712c444c6dee9a9b01df563a74774edfc680bc664d267e335910e72949",
  "ladom-v2/js/lyrics-engine.js": "56ae86991c6bfb7c61624945c25b3c97f91cdf345050c3782f3609c748074f1d",
  "ladom-v2/js/state.js": "a025602618473eb570b0e4a08ba2d9e9249edb33f262776343fd76ad588384dd"
};
let hashesOk = true;
for (const [f, h] of Object.entries(HASHES)) {
  try { if (sha(path.join(T, f)) !== h) hashesOk = false; } catch { hashesOk = false; }
}
t('13 прототипы: sha256 × ' + Object.keys(HASHES).length + ' совпадают с присланными владельцем', hashesOk);

// В. Цех такта
// (страж цеха следует за живой правдой дома: их v10.89 «АДАПТЕР» (С64) и их v10.89.1
//  «ЛАТКА УУП» (С65, кэш v145, летопись 78) вкатили свою правду; v10.90 «ЗАКОН» (С66)
//  поднял её — дом 10.90/v146/летопись 79 (ЗАКОН ЯЗЫКОВ I-12 + ПУЛЬТ-чистка + Л1 mock);
//  факты v10.86 и их v10.87/v10.88/v10.89/v10.89.1 несменяемы — записи летописи
//  74/75/76/77/78, CHANGELOG [10.86]/[10.87]/[10.88]/[10.89]/[10.89.1] — проверяются как прежде)
const ver = JSON.parse(readFileSync(path.join(T, 'data/versions.json'), 'utf8'));
t('14 цех: дом 10.91 «СВОИ», кэш v147', ver.дом.версия === '10.91' && ver.дом.такт === 'СВОИ' && ver.дом.поколение_кэша === 'v147');
t('15 цех: летопись 80 — записи 74–79 (10.86, их 10.87 УУП, их 10.88 КАНОН, их 10.89 АДАПТЕР, их 10.89.1 ЛАТКА УУП, их 10.90 ЗАКОН) целы, запись 80 = 10.91 СВОИ', Array.isArray(ver.летопись) && ver.летопись.length === 80 && ver.летопись[73] && ver.летопись[73].версия === '10.86' && ver.летопись[74] && ver.летопись[74].версия === '10.87' && ver.летопись[75] && ver.летопись[75].версия === '10.88' && ver.летопись[76] && ver.летопись[76].версия === '10.89' && ver.летопись[77] && ver.летопись[77].версия === '10.89.1' && ver.летопись[78] && ver.летопись[78].версия === '10.90' && ver.летопись[79] && ver.летопись[79].версия === '10.91');
const chlg = readFileSync(path.join(T, 'CHANGELOG.md'), 'utf8');
t('16 CHANGELOG: [10.86] записан', chlg.includes('## [10.86]'));
const sw = readFileSync(path.join(T, 'sw15.js'), 'utf8');
t('17 sw15: поколение шагнуло на живое s15-orkestrator-v147', sw.includes("s15-orkestrator-v147") && !sw.includes("s15-orkestrator-v146"));

console.log(`итог: ${ok}/${all}`);
process.exit(ok === all ? 0 : 1);
