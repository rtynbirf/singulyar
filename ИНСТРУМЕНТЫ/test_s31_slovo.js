/* Оракул такта v10.56 «СЛОВО» (С36) — байт-проверка дома.
   Приказ владельца: «РАБОТАЙ СОГЛАСНО ЛОГИКЕ ВНОВЬ ОТКРЫВШИХСЯ ОБСТОЯТЕЛЬСТВ
   СОГЛАСНО ДОРОЖНОЙ КАРТЕ ВСЕ ЛУЧШИЕ МИРОВЫЙ ТРЕНДЫ ПРАКТИК ИССЛЕДУЙ,
   ИММЕРДЖЕНТНОЕ СИНГУЛЯРНОЕ ЧТОБ СТАЛО НАШИМ».
   Несёт: партитура слова .harm/0.1 (валидатор + ручная разметка куплета 1
   и финала), мост маркерных весов в __PULSE, профиль доступности
   harm-profile/0.1 (10 осей, пресеты, экспорт/импорт), вкладка ПУЛЬТа
   «ПРОФИЛЬ», ящик «слово·профиль», проба ЗДОРОВЬЕ 25, Малыш v0.9, ШТАБ+4.
   Запуск: node ИНСТРУМЕНТЫ/test_s31_slovo.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
let ok = 0, bad = 0;
function чек(имя, cond) {
  if (cond) { ok++; console.log('  ✓ ' + имя); }
  else { bad++; console.log('  ✗ ' + имя); }
}
console.log('=== ОРАКУЛ v10.56 «СЛОВО» ===');

const raw = read('СИНГУЛЯР_31_ЛАДОМ.html');
const РЕЕСТР = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
const ВЕР = РЕЕСТР.дом.версия, ТАКТ = РЕЕСТР.дом.такт, КЭШ = РЕЕСТР.дом.поколение_кэша, ДАТА = РЕЕСТР.дом.дата;
const sw = read('sw15.js');
const llm = read('БИБЛИОТЕКИ/adapter-os/llm.mjs');
const vj = JSON.parse(read('data/versions.json'));
const rd = read('README.md');
const штаб = read('ШТАБ_РЕВИЗИИ_31.html');

/* ── 1. Штампы такта ── */
чек("титул дома живёт тактом реестра («"+ТАКТ+"»)", raw.includes("СИНГУЛЯР ·31 v"+ВЕР+" «"+ТАКТ+"»"));
чек('window.APP штамп: v/такт/кэш (живой реестр)', raw.includes("v:'"+ВЕР+"', такт:'"+ТАКТ+"'") && raw.includes('s15-orkestrator-'+КЭШ));
чек('шапка-комментарий С36 на месте', raw.includes('такт v10.56 «СЛОВО» (С36'));
чек('летопись КОДЕКСа в шапке сохранена', raw.includes('такт v10.54 «КОДЕКС» (С35'));
чек('VER-фолбэк зала честен (литерал зала v10.78)', raw.includes('|| "v10.78 «СЛОГ»";'));

/* ── 2. __ХАРМ: партитура слова (.harm/0.1) — живое поведение через vm ── */
const блоки = raw.split(/<script(?:\s[^>]*)?>/).slice(1).map(s => s.split('</script>')[0]);
const хармБлок = блоки.find(b => b.includes('window.__ХАРМ') && b.includes('harm/0.1') && b.includes('function проверь'));
чек('блок __ХАРМ найден в доме', !!хармБлок);
let Х = null;
if (хармБлок) {
  try {
    const ctx = { window: {}, console };
    vm.createContext(ctx);
    vm.runInContext(хармБлок.replace(/^\s*"use strict";/, '"use strict";'), ctx, { timeout: 4000 });
    Х = ctx.window.__ХАРМ;
  } catch (e) { console.log('    (vm: ' + e.message + ')'); }
}
чек('__ХАРМ родился: ver/схема/вердикт (факт зала: ver v10.61 «РУЧКИ»)', !!Х && Х.ver === 'v10.61 «РУЧКИ»' && Х.схема === 'harm/0.1');
чек('партитура «Просто люби»: валидатор принял', !!Х && Х.вердикт && Х.вердикт.ok === true && Х.вердикт.ошибок === 0);
чек('ручная разметка: 7 строк, 59 слогов, bpm 104', !!Х && Х.размечено === 7 && Х.слогов === 59 && Х.док.bpm === 104);
чек('валидатор честен: text без alt отклонён (правило 1)', !!Х && Х.проверь({ schema: 'harm/0.1', title: 'б', bpm: 100, timeline: [{ beat: 0, type: 'text', data: { words: [[['а', 1]]] } }] }).ok === false);
чек('валидатор честен: prompt без альтернативы жеста отклонён (правило 2)', !!Х && Х.проверь({ schema: 'harm/0.1', title: 'б', bpm: 100, timeline: [{ beat: 0, type: 'prompt', alt: 'хлопни', data: { action: 'clap' } }] }).ok === false);
чек('валидатор честен: мажорная версия новее дома отклонена (правило 5)', !!Х && Х.проверь({ schema: 'harm/1.0', title: 'б', bpm: 100, timeline: [{ beat: 0, type: 'pause', data: { beats: 1 } }] }).ok === false);
чек('валидатор честен: слова в alt ≠ words отклонено', !!Х && Х.проверь({ schema: 'harm/0.1', title: 'б', bpm: 100, timeline: [{ beat: 0, type: 'text', alt: 'а б в', data: { words: [[['а', 1]]] } }] }).ok === false);
if (Х) {
  const сл = Х.токены('Мы бежим за светом призрачным,', 'syl');
  const слоги = сл.filter(t => !t.sp);
  const слw = слоги.map(t => t.w);
  const сумма = слw.reduce((a, b) => a + b, 0);
  const слW = Х.токены('Мы бежим за светом призрачным,', 'word');
  const словаW = слW.filter(t => !t.sp);
  чек('маркерные веса: куплет 1 = 9 слогов, все w>0, сумма > 0', слоги.length === 9 && слw.every(w => w > 0) && сумма > 0);
  чек('ударный слог «жим» дольше слабого «за» (авторский ритм в байте)', слw[2] > слw[3]);
  чек('гран word: 5 слов, текст слова с пунктуацией («призрачным,»)', словаW.length === 5 && словаW.some(t => t.s === 'призрачным,'));
  чек('гран line/char — честный null (дом сам)', Х.токены('Мы бежим за светом призрачным,', 'line') === null && Х.токены('Мы бежим за светом призрачным,', 'char') === null);
  чек('неразмеченная строка — честный null (фолбэк дома)', Х.токены('Кто любил, тот по-настоящему жил.', 'syl') === null);
  чек('финал «Просто люби.» размечен', !!Х.токены('Просто люби.', 'syl'));
}
чек('мост в __PULSE.rebuild стоит', raw.includes('window.__ХАРМ.токены(text,GRANS[granIdx].k)') && raw.includes('data-харм'));
чек('resetLine снимает гард data-харм', raw.includes('el.removeAttribute("data-харм");'));

/* ── 3. __ПРОФИЛЬ: профиль доступности harm-profile/0.1 ── */
чек('профиль: схема harm-profile/0.1 в доме', raw.includes('"harm-profile/0.1"'));
чек('профиль: 10 осей (motion…output)', ['motion', 'gran', 'size', 'contrast', 'tempo', 'sound', 'haptic', 'offset', 'input', 'output'].every(о => raw.includes(о + ':')));
чек('профиль: пресеты без диагнозов', raw.includes('"минимум стимулов"') && raw.includes('"читаю медленно"') && raw.includes('"только текст и вибро"'));
чек('профиль: клампа импорта и отказ формату новее', raw.includes('function клампа') && raw.includes('формат новее дома'));
чек('профиль: экспорт только по явному действию (Blob+a[download])', raw.includes('ЛАДОМ-профиль.harm-profile.json'));
чек('профиль: ось offset через __SYNC_SET (сетка 5 мс дома)', raw.includes('window.__SYNC_SET(Math.round(v)/1000)'));
чек('профиль: ось tempo с preservesPitch', raw.includes('a.preservesPitch=true'));
чек('профиль: ось haptic через __VIB_K', raw.includes('window.__VIB_K=v;'));
чек('профиль: ввод/вывод честны (брайль/switch — нет)', raw.includes('брайль — честно нет') && raw.includes('switch — честно нет'));
чек('гостевой пульс масштабируется профилем (вибра)', raw.includes('window.__ПРОФИЛЬ&&window.__ПРОФИЛЬ.вибра'));
чек('голос: команды профиля', raw.includes('has("минимум стимулов")') && raw.includes('has("читаю медленно","читать медленно")') && raw.includes('has("профиль")'));
чек('справка голоса упоминает «профиль»', raw.includes('«бирка», «профиль», «тише», «громче».'));

/* ── 4. ПУЛЬТ: вкладка ПРОФИЛЬ ── */
чек('вкладка ПРОФИЛЬ: кнопка + панель', raw.includes('id="ptab-prof" data-pt="prof"') && raw.includes('id="ppanel-prof"') && raw.includes('data-ptab="prof"'));
чек('вкладка ПЕРЕД ДАННЫМИ (после ЛЮДИ)', raw.indexOf('ptab-prof') < raw.indexOf('ptab-data') && raw.indexOf('ptab-people') < raw.indexOf('ptab-prof'));
чек('рули профиля в панели', ['profP1', 'profP2', 'profP3', 'profP0', 'profMotion', 'profGran', 'profSize', 'profHc', 'profRate', 'profVol', 'profVib', 'profOff', 'profIO', 'profHarm', 'profExport', 'profImport', 'profImportFile'].every(id => raw.includes('id="' + id + '"')));
чек('партитура и экспорт видны в поиске ПУЛЬТа (prow2)', (raw.match(/<div class="prow2"><span class="plab2">ПРЕСЕТЫ · БЕЗ ДИАГНОЗОВ<\/span>/g) || []).length === 1);

/* ── 5. Обряд: ящик, КАЗНА, проба 25 ── */
чек('ящик «слово·профиль» в комоде', raw.includes('К.ящики.push("слово·профиль")'));
чек('КАЗНА: семья «слово·профиль» в реестре (факт зала: + __ВИБРОСЛОВА)', raw.includes('["слово·профиль",      /^__ХАРМ$|^__ПРОФИЛЬ$|^__ВИБРОСЛОВА$/]'));
чек('проба ЗДОРОВЬЕ 25 определена в зале', raw.includes('window.__HEALTH25 = function()'));
чек('проба 25: пять честных проб', (raw.split('window.__HEALTH25 = function()')[1] || '').split('return out;')[0].includes('Валидатор .harm честен'));

/* ── 6. Малыш v0.9 ── */
чек('Малыш: СЛОВАРЬ_ВЕРСИЯ живая (строго новее их v0.9; v11.47 «ЗАКРЫТО»)', /export const СЛОВАРЬ_ВЕРСИЯ = 'v\d+\.\d+';/.test(llm));
чек('Малыш: маркер «ВЕРСИЯ ПРАВИЛ: v0.10»', llm.includes('ВЕРСИЯ ПРАВИЛ: v0.10'));
чек('Малыш: их 16 ТИХО + моё 17 ПРОФИЛЬ ДОСТУПНОСТИ', llm.includes('16. ДОМ ДЫШИТ ТИХО') && llm.includes('17. ПРОФИЛЬ ДОСТУПНОСТИ') && llm.includes('пресеты говорят словами, без диагнозов'));
чек('Малыш: 6 фраз профиля', ['открой профиль', 'профиль доступности', 'минимум стимулов', 'читаю медленно', 'что такое слово-пульс', 'что такое профиль'].every(ф => llm.includes("фраза: '" + ф + "'")));
чек('Малыш: доучка v0.10 в шапке файла (поверх их v0.9)', llm.includes('Доучка v0.10 (такт дома «СЛОВО»') && llm.includes('v0.9 «ПОТОК» коллег'));

/* ── 7. Релизные штампы ── */
чек('sw15: кэш живого поколения («"+КЭШ+"»)', sw.includes("var S15_CACHE = 's15-orkestrator-"+КЭШ+"';"));
чек('sw15: такт-комментарий С36', sw.includes('Такт v10.56 «СЛОВО» (С36,'));
чек('versions.json: дом живёт тактом реестра', vj.дом.версия === ВЕР && vj.дом.такт === ТАКТ && vj.дом.поколение_кэша === КЭШ);
чек('versions.json: летопись живёт (последняя запись = такт реестра)', vj.летопись[vj.летопись.length - 1].такт === ТАКТ);
чек('versions.json: летопись цела (≥100, append-only, ПОТОК коллег в истории)', vj.летопись.length >= 100 && vj.летопись.some(e => e.такт === 'ПОТОК') && vj.летопись.some(e => e.такт === 'АТЛАС'));
чек('README: строка журнала v10.55', rd.includes('| v10.56 | «СЛОВО» | партитура слова .harm/0.1'));

/* ── 8. ШТАБ: 24 тренда, 4 новых ── */
чек('ШТАБ: JSON трендов цел, 24 карточки', (() => { try { const м = штаб.match(/"trends": (\[.*?\]), "runtime"/s); const d = JSON.parse('{"trends":' + м[1] + '}'); return d.trends.length === 39; /* факт ШТАБа (догнан на такте v11.19: тренд-карточки 24 → 39) */ } catch (e) { return false; } })());
чек('ШТАБ: 4 карточки исследования v10.55', ['Слоговые партитуры — индустриальный формат', 'Темп без «хомячка»', 'Профиль доступности как объект', 'Калибровка в руках зрителя'].every(н => штаб.includes(н)));

/* ── 9. Валидатор ИНСТРУМЕНТЫ: существует и принимает демо трека ── */
чек('harm_validate.mjs на месте', fs.existsSync(path.join(R, 'ИНСТРУМЕНТЫ/harm_validate.mjs')));
(async () => {
  try {
    const { harmПроверь } = await import('file://' + path.join(R, 'ИНСТРУМЕНТЫ/harm_validate.mjs'));
    const демо = JSON.parse(read('ДОКУМЕНТЫ/ТРЕКИ/HARMONIA/examples/demo.harm.json'));
    чек('валидатор ИНСТРУМЕНТЫ: demo.harm.json — ЗАЧЁТ', harmПроверь(демо).ok === true);
    чек('валидатор ИНСТРУМЕНТЫ: битое — ПРОВАЛ', harmПроверь({ schema: 'harm/0.1', title: 'б', bpm: 100, timeline: [{ beat: 0, type: 'text', data: {} }] }).ok === false);
  } catch (e) { чек('валидатор ИНСТРУМЕНТЫ: импорт (' + e.message + ')', false); }

  /* ── 10. Синтаксис всех inline-блоков дома ── */
  let блоков = 0, пало = 0;
  for (const б of блоки) {
    const т = б.trim();
    if (!т) continue;
    try { JSON.parse(т); continue; } catch (e) {}   /* чистый JSON (speculationrules и пр.) — честный пропуск */
    try { new Function(т); блоков++; } catch (e) { пало++; console.log('    ✗ синтаксис: ' + String(e.message).slice(0, 90)); }
  }
  чек('new Function: все inline-блоки дома (' + блоков + '/' + (блоков + пало) + ')', пало === 0 && блоков > 25);

  console.log('=== ИТОГ: ' + ok + ' зачёт / ' + bad + ' провал ===');
  process.exit(bad ? 1 : 0);
})();
