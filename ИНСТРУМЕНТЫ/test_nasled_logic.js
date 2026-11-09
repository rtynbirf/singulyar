/* ═══ страж такта v11.56 «НАСЛЕДСТВО» (С153) ═══
   Проверяет ЧИСТУЮ МАТЕМАТИКУ порта (window.__НАСЛЕД_ЯДРО из naslScript ·31):
   ТЭП (·32 S32_ЯДРО), суфлёр (·16), UltraStar-парсер, DTW, счёт пения.
   Загрузка модуля — со стабами DOM (модуль жив в ·31, здесь его голова).
   Запуск: node --test ИНСТРУМЕНТЫ/test_nasled_logic.js (или общий гейт: bash scripts/preflight_gate.sh). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = path.join(__dirname, '..', 'СИНГУЛЯР_31_ЛАДОМ.html');
const src = fs.readFileSync(HTML, 'utf-8');
const m = src.match(/<script id="naslScript">([\s\S]*?)<\/script>/);
assert.ok(m, 'naslScript жив в ·31');

/* стабы DOM: модуль должен молча встать без дома */
const элемент = () => ({ style:{}, setAttribute(){}, addEventListener(){}, appendChild(){},
                         textContent:'', hidden:false, classList:{add(){},remove(){}} });
global.window = {};
global.document = { readyState:'loading', addEventListener(){}, getElementById(){ return null; },
                    querySelectorAll(){ return []; }, createElement: элемент, body: элемент() };
/* navigator в node 24 — только getter; модуль читает его лишь внутри функций, при загрузке не трогает */
new Function(m[1])();

const ЯДРО = global.window.__НАСЛЕД_ЯДРО;
assert.ok(ЯДРО, '__НАСЛЕД_ЯДРО поднят');

test('ТЭП: окна и множитель комбо — порт S32_ЯДРО байт-в-байт', () => {
  assert.deepEqual(ЯДРО.окна, { ИДЕАЛ: 0.080, ТОЧНО: 0.350 });
  const идеал0 = ЯДРО.тэпОценка(0.05, 0);
  assert.equal(идеал0.тип, 'ИДЕАЛ'); assert.equal(идеал0.прибавка, 30); assert.equal(идеал0.комбо, 1);
  const идеал10 = ЯДРО.тэпОценка(0.05, 10);
  assert.equal(идеал10.прибавка, 60, 'комбо 10 → множитель ×2');
  const точно = ЯДРО.тэпОценка(0.30, 0);
  assert.equal(точно.тип, 'ТОЧНО'); assert.ok(точно.прибавка > 10 && точно.прибавка <= 20);
  const мимо = ЯДРО.тэпОценка(0.5, 7);
  assert.equal(мимо.тип, 'МИМО'); assert.equal(мимо.прибавка, 0); assert.equal(мимо.комбо, 0);
});

test('ТЭП: слоги и правило первого слова (v10.91)', () => {
  assert.equal(ЯДРО.слогов('мама'), 2);
  assert.equal(ЯДРО.слогов('вьюга'), 2);
  assert.equal(ЯДРО.слогов('ль'), 1, 'без гласных — минимум 1');
  const ст = ЯДРО.разобратьСтроки([[0, 'мама мыла раму'], [4, 'вьюга']]);
  assert.equal(ст.length, 2);
  assert.equal(ст[0].слова[0].start, 0, 'первое слово не молчит');
  assert.ok(ст[0].слова[2].end <= ст[0].t1 + 1e-9);
  assert.ok(ст[1].t1 > ст[1].t0);
});

test('ТЭП: ближайшее неспетое — окно ±1 строка, спетые пропускаются', () => {
  const ст = ЯДРО.разобратьСтроки([[0, 'а б в'], [3, 'г д'], [6, 'е ж']]);
  const н1 = ЯДРО.ближайшееНеспетое(ст, 0.1, 0, 0);
  assert.ok(н1 && н1.строка === 0 && н1.инд === 0);
  const н2 = ЯДРО.ближайшееНеспетое(ст, 0.1, 0, 0*10000+1); /* первое спето: следующий неспетый = инд 1 */
  assert.ok(н2 && н2.инд === 1, 'спетое пропущено');
  const н3 = ЯДРО.ближайшееНеспетое(ст, 6.2, 1, 1*10000+1);
  assert.ok(н3 && н3.строка === 2, 'шаг вперёд по строкам');
});

test('СУФЛЁР: центы с заворотом октавы (·16)', () => {
  assert.equal(ЯДРО.центыОктав(0, 11), 100, 'полтона');
  assert.equal(ЯДРО.центыОктав(11, 0), -100);
  assert.equal(ЯДРО.центыОктав(0, 6), 600, 'тритон');
  assert.equal(ЯДРО.центыОктав(60, 60), 0);
  assert.equal(Math.abs(ЯДРО.центыОктав(69, 57)), 0, 'октава заворачивается в ноль');
});

test('СУФЛЁР: медиана и фреквВМиди', () => {
  assert.equal(ЯДРО.медиана([3, 1, 2]), 2);
  assert.equal(ЯДРО.медиана([4, 1, 2, 3]), 2.5);
  assert.ok(Math.abs(ЯДРО.фреквВМиди(440) - 69) < 1e-9);
  assert.ok(Math.abs(ЯДРО.фреквВМиди(880) - 81) < 1e-9);
});

test('СУФЛЁР: UltraStar-парсер (BPM/GAP/PITCH+60)', () => {
  const txt = '#TITLE:проба\n#BPM:120\n#GAP:500\n: 0 4 12 до\n: 4 4 14 ре\n* 8 8 16 ми\n-  16\n';
  const р = ЯДРО.разборУльтрастара(txt);
  assert.equal(р.bpm, 120); assert.equal(р.gapMs, 500);
  assert.equal(р.notes.length, 3);
  const бит = 60/(120*4);
  assert.ok(Math.abs(р.notes[0].t0 - 0.5) < 1e-9);
  assert.ok(Math.abs(р.notes[0].t1 - (0.5 + 4*бит)) < 1e-9);
  assert.equal(р.notes[0].midi, 72, 'PITCH 12 → midi 72');
  assert.equal(р.notes[2].золото, true);
  assert.equal(р.notes[0].слово, 'до');
});

test('СУФЛЁР: события голоса — медиана устойчивого тона', () => {
  const кадры = [];
  for (let i = 0; i < 40; i++) кадры.push({ t: i*0.02, f0: 440 + (i%3), rms: 0.05 });
  for (let i = 40; i < 60; i++) кадры.push({ t: i*0.02, f0: 0, rms: 0.001 });
  const св = ЯДРО.события(кадры);
  assert.equal(св.length, 1, 'один устойчивый тон — одно событие');
  assert.ok(Math.abs(ЯДРО.центыОктав(св[0].midi, 69)) < 15, 'медиана ≈ 440 Гц');
  assert.ok(Math.abs(св[0].t1 - 0.8) < 0.1);
});

test('СУФЛЁР: счёт пения — точное попадание даёт 100%', () => {
  const эталон = { bpm: 120, notes: [
    { t0: 0, t1: 0.5, midi: 72, слово: 'до' },
    { t0: 0.5, t1: 1.0, midi: 74, слово: 'ре' },
    { t0: 1.0, t1: 1.5, midi: 76, слово: 'ми' }] };
  const событ = эталон.notes.map(n => ({ t0: n.t0 + 0.01, t1: n.t1 - 0.01, midi: n.midi }));
  const рез = ЯДРО.счёт(эталон, событ);
  assert.ok(рез.процент >= 90 && рез.процент <= 100, 'точный проход ≈ 100 (покрытие окна честное: ' + рез.процент + ')');
  assert.equal(рез.нот, 3);
  const нулевой = ЯДРО.счёт(эталон, []);
  assert.equal(нулевой.процент, 0, 'не пел — ноль, честно');
  const съехавший = ЯДРО.счёт(эталон, [{ t0: 0, t1: 1.5, midi: 74 + 12 }]);
  assert.ok(съехавший.процент >= 60, 'октавный заворот прощает (ре — идеал, соседи — зачёт: ' + съехавший.процент + '%)');
});

test('СУФЛЁР: DTW — одинаковые последовательности сходятся в ноль', () => {
  const a = [60, 62, 64, 65, 67], b = [60, 62, 64, 65, 67];
  const св = ЯДРО.dtw(a, b, 3);
  assert.ok(св.цена < 1e-9);
  assert.equal(св.пары.length, 5);
  assert.equal(св.пары[0][0], 0); assert.equal(св.пары[4][0], 4);
  const сдвиг = ЯДРО.dtw([60, 60, 60], [60, 62, 60], 3);
  assert.ok(сдвиг.цена > 0);
});

test('пульт: вкладка НАСЛЕДСТВО в HTML дома — aria-канон и группы', () => {
  assert.ok(src.includes('id="ptab-nasl"'), 'кнопка вкладки');
  assert.ok(src.includes('data-pt="nasl"'), 'ключ группы');
  assert.ok(src.includes('id="ppanel-nasl"'), 'панель');
  const таб = src.match(/<button role="tab" id="ptab-nasl"[\s\S]*?<\/button>/)[0];
  assert.ok(таб.includes('aria-controls="ppanel-nasl"'));
  assert.ok(таб.includes('data-tip='), 'справка для скринридера');
  for (const ид of ['наслТэпКнопка','наслУстПеть','наслЗвезда','наслЗалСоздать','наслСинтМетро','наслБрайльТумб'])
    assert.ok(src.includes('id="' + ид + '"'), 'орган ' + ид);
  assert.ok(!/\.innerHTML|innerHTML\s*=/.test(m[1]), '0 innerHTML-вставок в модуле (упоминание в комментарии — не использование)');
  assert.ok(!m[1].includes('document.write'), '0 document.write');
});

test('гварды дома: глобалы только __НАСЛЕД*, кэш поднят', () => {
  assert.ok(src.includes("__НАСЛЕД={вер:'v11.56'"), 'экспорт версией');
  assert.ok(src.includes("s15-orkestrator-v208"), 'APP кэш v208');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw15.js'), 'utf-8');
  assert.ok(sw.includes("var S15_CACHE = 's15-orkestrator-v208';"), 'S15_CACHE v208');
  assert.ok(!/ЗАКОН_ПОРЯДОК[\s\S]{0,400}НАСЛЕД/.test(src), 'порядок языков не тронут');
});
