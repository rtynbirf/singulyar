/* Оракул такта v10.54 «КОДЕКС» (С35) — байт-проверка дома.
   Приказ владельца: «СИНТЕЗИРУЙ ИНТЕГРИРУЙ ДОКУМЕНТАЦИЮ С ТЗ И ДОРОЖНОЙ
   КАРТОЙ В ПАБЛИК В РЕПУ; ПОДКЛЮЧАЙ И ДРУГИЕ ТРЕКИ; МАЛЫША НАУКИВАЙ».
   Несёт: треки в паблик, двери ·40/·41, Малыш v0.8, ОБЕРЕГ-фичи живы
   (ре-посадка), горячий хвост F-Г1/F-Г2 жив, летопись/README (R-13 закрыт),
   ШТАБ-тренды. Запуск: node ИНСТРУМЕНТЫ/test_s31_kodex.js */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
let ok = 0, bad = 0;
function чек(имя, cond) {
  if (cond) { ok++; console.log('  ✓ ' + имя); }
  else { bad++; console.log('  ✗ ' + имя); }
}
console.log('=== ОРАКУЛ v10.54 «КОДЕКС» ===');

const raw = read('СИНГУЛЯР_31_ЛАДОМ.html');
const РЕЕСТР = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
const ВЕР = РЕЕСТР.дом.версия, ТАКТ = РЕЕСТР.дом.такт, КЭШ = РЕЕСТР.дом.поколение_кэша, ДАТА = РЕЕСТР.дом.дата;
const sw = read('sw15.js');
const mod = read('singulyar-modules.js');
const idx = read('index.html');
const f404 = read('404.html');
const vj = JSON.parse(read('data/versions.json'));
const rd = read('README.md');

/* ── 1. Штампы такта ── */
чек("титул дома живёт тактом реестра («"+ТАКТ+"»)", raw.includes("СИНГУЛЯР ·31 v"+ВЕР+" «"+ТАКТ+"»"));
чек('window.APP штамп: v/такт/кэш (живой реестр)', raw.includes("v:'"+ВЕР+"', такт:'"+ТАКТ+"'") && raw.includes('s15-orkestrator-'+КЭШ));
чек('шапка-комментарий С35 на месте', raw.includes('такт v10.54 «КОДЕКС» (С35'));
чек('летопись ОБЕРЕГа в шапке сохранена', raw.includes('такт v10.53 «ОБЕРЕГ» (С34'));

/* ── 2. ОБЕРЕГ-фичи живы (ре-посадка после перезаписи коллег) ── */
чек('ЩИТ: точка индикатора (цвет палитры-закона #d4af37)', raw.includes('.shield.жив i{background:#d4af37'));
чек('ЩИТ: plain language «СВОЁ»/«МИКРОФОН»', raw.includes("жив ? 'МИКРОФОН' : 'СВОЁ'"));
чек('ЩИТ: гарда двойной обёртки', raw.includes('Т.__щитОбёрнут'));
чек('строка-герой 1.045 жива', raw.includes('1.045'));
чек('ТИХО: спокойный час жив', (raw.match(/ТИХО/g) || []).length >= 10);
чек('АУРА жива (auraScript + вер v10.53)', raw.includes('<script id="auraScript">') && raw.includes("__АУРА = { ver:'v10.53'"));
чек('ящик «оберег·щит» в комоде', raw.includes('К.ящики.push("оберег·щит")'));
чек('проба ЗДОРОВЬЕ 24 живёт в зале', raw.includes('window.__HEALTH24'));

/* ── 3. Горячий хвост F-Г1/F-Г2 жив ── */
чек('F-Г1: мост честен (геттер↔ящик)', raw.includes('мостЧестен'));
чек('F-Г2: persist при первом касании', raw.includes('хранЖест'));
чек('F-Г2: UNKNOWN ≠ FAIL', raw.includes('UNKNOWN ≠ FAIL'));

/* ── 4. Двери ·40/·41 ── */
чек('ядро: s40 ГАРМОНИЯ с файлом', mod.includes("id: 's40'") && mod.includes("файл: 'harmonia-prototype.html'"));
чек('ядро: s41 НАМЕРЕНИЕ с файлом', mod.includes("id: 's41'") && mod.includes("файл: 'hir-prototype.html'"));
чек('ядро: версия едина (шапка=маркер=поле), не ниже 1.20.0 (ТЗ-1)', (()=>{ const ВЯД=(mod.match(/ЯДРО МОДУЛЕЙ v(\d+\.\d+\.\d+)/)||[])[1]; const ВМАРК=(mod.match(/__SINGULYAR_MODULES__ = 'v([\d.]+)'/)||[])[1]; const ВПОЛЕ=(mod.match(/версия:\s*'([\d.]+)'/)||[])[1]; if(!ВЯД||ВЯД!==ВМАРК||ВЯД!==ВПОЛЕ) return false; const x=ВЯД.split('.').map(Number), пол=[1,20,0]; for(let i=0;i<3;i++){ if(x[i]>пол[i]) return true; if(x[i]<пол[i]) return false; } return true; })());
чек('АРИАДНА: s40/s41 на лице дома', idx.includes("ид:'s40'") && idx.includes("ид:'s41'"));
чек('404: без застывшего счёта дверей (счёт живёт в организме дома)', !/\d+ двер/.test(f404));
чек('sw15: прототипы треков в пре-кэше', sw.includes("'./harmonia-prototype.html'") && sw.includes("'./hir-prototype.html'"));
чек('sw15: КОДЕКС в пре-кэше', sw.includes("'./ДОКУМЕНТЫ/КОДЕКС_СИНТЕЗ_ТРЕКОВ.md'"));
чек('прототип HARMONIA на месте и без сети', fs.existsSync(path.join(R, 'harmonia-prototype.html')) && !/src\s*=\s*["']https?:/.test(read('harmonia-prototype.html')));
чек('прототип HIR на месте и без сети', fs.existsSync(path.join(R, 'hir-prototype.html')) && !/src\s*=\s*["']https?:/.test(read('hir-prototype.html')));

/* ── 5. Треки в паблике ── */
const harmDocs = ['00_SYNTHESIS.md','01_TZ.md','02_ROADMAP.md','03_ARCHITECTURE.md','04_PROFILE_SPEC.md','05_PRIVACY_THREAT_MODEL.md','06_QA_PLAN.md','07_HARM_FORMAT.md','08_BEST_PRACTICES_SOURCES.md','09_FORECAST_2026_2036.md','10_CORRECTIONS.md'];
чек('HARMONIA: 11 документов в паблике', harmDocs.every(d => fs.existsSync(path.join(R, 'ДОКУМЕНТЫ/ТРЕКИ/HARMONIA/docs', d))));
чек('HARMONIA: лицензия MIT/CC BY внутри', fs.existsSync(path.join(R, 'ДОКУМЕНТЫ/ТРЕКИ/HARMONIA/LICENSE')));
const schema = JSON.parse(read('ДОКУМЕНТЫ/ТРЕКИ/HARMONIA/schema/harm.schema.json'));
чек('harm.schema.json валиден', !!schema && (schema.$schema || schema.title));
JSON.parse(read('ДОКУМЕНТЫ/ТРЕКИ/HARMONIA/examples/demo.harm.json'));
чек('demo.harm.json валиден', true);
чек('HIR: ТЗ в паблике', fs.existsSync(path.join(R, 'ДОКУМЕНТЫ/ТРЕКИ/HIR/docs/TZ.md')));
чек('HIR: SHA256SUMS в паблике', fs.existsSync(path.join(R, 'ДОКУМЕНТЫ/ТРЕКИ/HIR/SHA256SUMS.txt')));
const kodex = read('ДОКУМЕНТЫ/КОДЕКС_СИНТЕЗ_ТРЕКОВ.md');
чек('КОДЕКС-синтез: закон СИНГУЛЯРА внутри', kodex.includes('эргономика') && kodex.includes('MeaningEnvelope') && kodex.includes('harm-profile'));
чек('ТРЕКИ/README: происхождение с хэшами', read('ДОКУМЕНТЫ/ТРЕКИ/README.md').includes('16e7fbb8eb93922c') && read('ДОКУМЕНТЫ/ТРЕКИ/README.md').includes('1152e2fbb682fe49'));

/* ── 6. Малыш v0.8 ── */
const llm = read('БИБЛИОТЕКИ/adapter-os/llm.mjs');
чек('СЛОВАРЬ_ВЕРСИЯ v0.10 (факт адаптера)', llm.includes("СЛОВАРЬ_ВЕРСИЯ = 'v0.10'"));
чек('правило 15 ТРЕКИ ДОМА', llm.includes('15. ТРЕКИ ДОМА'));
чек('маркер ВЕРСИЯ ПРАВИЛ: v0.8', llm.includes('ВЕРСИЯ ПРАВИЛ: v0.8'));
чек('гейт версий правил', llm.includes('версияПравил') && llm.includes('>= версияПравил(ПРАВИЛА_ТЕКСТ)'));
чек('карта дома: гармония/намерение', llm.includes("'harmonia-prototype.html'") && llm.includes("'hir-prototype.html'"));
чек('фразы треков (открой гармонию)', llm.includes("фраза: 'открой гармонию'") && llm.includes("фраза: 'открой намерение'"));
чек('старое имя вычещено из Малыша', !llm.includes('квартирник'));
чек('правило 13 несёт живой счёт дверей (ТЗ-1)', llm.includes('Дом — это ' + vj.счётчики.дверей + ' двер'));

/* ── 7. Летопись и README (R-13 закрыт) ── */
чек('versions.json: дом живёт тактом реестра', vj.дом.версия === ВЕР && vj.дом.такт === ТАКТ && vj.дом.поколение_кэша === КЭШ);
чек('versions.json: счёт дверей = списку дверей реестра (ТЗ-1)', vj.счётчики.дверей === vj.двери.length);
чек('versions.json: летопись живёт (≥100, КОДЕКС в истории)', vj.летопись.length >= 100 && vj.летопись.some(e => e.такт === 'КОДЕКС'));
чек('versions.json: ОБЕРЕГ и ОРГАНИЗМ в летописи', vj.летопись.some(e => e.такт === 'ОБЕРЕГ') && vj.летопись.some(e => e.такт === 'ОРГАНИЗМ'));
чек('README: строка КОДЕКС в журнале', rd.includes('| v10.54 | «КОДЕКС» |'));
чек('README: журнал полон (≥50 строк)', (rd.match(/^\| v10\./gm) || []).length >= 50);
чек('README: сноска R-13 про 10.31/10.32', rd.includes('Примечание (R-13)'));

/* ── 8. sw15 летопись восстановлена ── */
чек('sw15: такт КОДЕКС в летописи', sw.includes('Такт v10.54 «КОДЕКС»'));
чек('sw15: ОБЕРЕГ и ЧУВСТВА в летописи', sw.includes('Такт v10.53 «ОБЕРЕГ»') && sw.includes('Такт v10.52 «ЧУВСТВА»'));
чек('sw15: кэш живого поколения («"+КЭШ+"»)', sw.includes('S15_CACHE = \'s15-orkestrator-'+КЭШ+'\''));

/* ── 9. ШТАБ: тренды ── */
const shtab = read('ШТАБ_РЕВИЗИИ_31.html');
чек('ШТАБ: EAA-тренд-карточка', shtab.includes('EAA — закон, а не лозунг'));
чек('ШТАБ: ISO 40500:2026 карточка', shtab.includes('ISO/IEC 40500:2026'));
чек('ШТАБ: слово-подсветка мейнстрим', shtab.includes('Слово-за-словом подсветка — мейнстрим'));

/* ── 10. CSP ШТАБа: хэши В КАВЫЧКАХ (грамматика CSP!) и = текущим скриптам ──
   Латентный баг найден тактом КОДЕКС: хэши без кавычек = невалидные источники,
   главный скрипт доски молча не исполнялся (M undefined, тренды не рендерились). */
const inline = [...shtab.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
  .map(m => 'sha256-' + crypto.createHash('sha256').update(m[2], 'utf8').digest('base64'));
const cspSrc = (shtab.match(/script-src[^;]*/) || [''])[0];
/* постур А (АТЛАС): 'unsafe-inline' допускается; иначе хэши обязаны быть закавычены */
const постурА = cspSrc.includes("'unsafe-inline'");
const quoted = inline.every(h => cspSrc.includes("'" + h + "'"));
чек('ШТАБ: CSP честен (постур А или закавыченные хэши)', постурА || quoted);

/* ── ИТОГ ── */
console.log(`=== ИТОГ: ${ok} зелёных, ${bad} красных ===`);
process.exit(bad === 0 ? 0 : 1);
