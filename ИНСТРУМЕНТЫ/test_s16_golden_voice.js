#!/usr/bin/env node
/* Тест дома: ЗОЛОТОЙ ГОЛОС вживлён в живую ·16 СУФЛЁР (такт v1.26.4, восстановлен после пожара окружения).
   Закон 4 дома «ничего на веру»: движок хозяина не подключается на слово — извлекаем блок из ·16
   (маркеры ЗГ-НАЧАЛО … ЗГ-ПРОВОДКА), гоняем ядро в Node и проверяем законы:
   эталон 10000, октаво-инвариантность, ступени, золотые ноты ×2, бонусы строк,
   тональность Крумхансл–Шмуклер с честным margin, трекер (гистерезис 60ц, ре-ми-до-си не слипаются),
   стык с парсером дома (PITCH = midi − 60). Плюс гигиена: ноль сети, ноль innerHTML в блоке.
   Запуск: node ИНСТРУМЕНТЫ/test_s16_golden_voice.js */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

let pass = 0, fail = 0; const fails = [];
function ok(усл, имя) {
  if (усл) { pass++; console.log('  ✓ ' + имя); }
  else { fail++; fails.push(имя); console.log('  ✗ FAIL ' + имя); }
}

const С16 = fs.readFileSync(path.join(__dirname, '..', 'СИНГУЛЯР_16_СУФЛЁР.html'), 'utf-8');

/* ── 1. Гигиена блока ── */
ok(С16.includes('ЗГ-НАЧАЛО') && С16.includes('ЗГ-ПРОВОДКА') && С16.includes('ЗГ-КОНЕЦ'),
   'маркеры ЗГ-НАЧАЛО/ЗГ-ПРОВОДКА/ЗГ-КОНЕЦ на месте');
const блокЦеликом = С16.split('const GoldenVoice')[1].split('ЗГ-КОНЕЦ')[0];
ok(!['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'innerHTML'].some(х => блокЦеликом.includes(х)),
   'в ЗГ-блоке ноль сети и ноль innerHTML');

/* ── 2. Ядро живёт в Node ── */
const движок_сырой = С16.split('const GoldenVoice')[1].split('ЗГ-ПРОВОДКА')[0];
/* хвост сырого куска — начало комментария-маркера ЗГ-ПРОВОДКА без закрытия: отрезаем по последнему '})();' */
const движок_код = 'const GoldenVoice' + движок_сырой.slice(0, движок_сырой.lastIndexOf('})();') + '})();'.length);
const песочница = { console, Math, isFinite, Number, Array, Object };
const GV = vm.runInNewContext(движок_код + '\nGoldenVoice', песочница, { filename: 'ЗГ-ядро-из-·16.js' });
ok(GV && typeof GV.score === 'function' && GV.version === '0.1.0', 'ядро извлечено из ·16 и живёт в Node (v' + (GV && GV.version) + ')');

/* ── утилиты ── */
function почти(a, b, т) { return Math.abs(a - b) <= (т || 1); }
function событиеИзОшибки(errCents) { return [{ t0: 0, t1: 1, midi: 69 + errCents / 100 }]; }

/* ── 3. Стык с парсером дома: .txt хранит PITCH = midi − 60 ── */
const п = GV.parseUltraStar('#BPM:120\n#GAP:0\n: 0 4 60 тест\nE');
ok(почти(п.notes[0].midi, 120) && почти(п.spb || (15 / п.bpm), 0.125), 'стык с домом: stored 60 → midi 120; spb = 15/BPM');
ok(почти(п.notes[0].t0, 0) && почти(п.notes[0].t1, 4 * 0.125), 'тайминги из тактов UltraStar (шестнадцатая)');

/* ── 4. Эталон: идеальное пение → 10000 ИДЕАЛЬНО (полный конвейер) ── */
const ТЕКСТ = ['#TITLE:Голос дома', '#ARTIST:СИНГУЛЯР', '#BPM:120', '#GAP:0',
  ': 0 4 60 до', ': 4 4 62 ре', ': 8 4 64 ми', '- 0 0 0', ': 12 4 65 фа', ': 16 4 67 соль', 'E'].join('\n');
const песня = GV.parseUltraStar(ТЕКСТ);
function синтПение(пес, о) {
  о = о || {};
  const центы = о.центы || 0, октава = о.октава || 0, fps = о.fps || 100;
  const кадры = [];
  const конец = пес.notes.reduce((м, н) => Math.max(м, н.t1), 0) + 0.05;
  for (let t = 0; t < конец; t += 1 / fps) {
    const н = пес.notes.find(x => t >= x.t0 && t <= x.t1);
    if (!н) { кадры.push({ t, f0: null, rms: 0 }); continue; }
    кадры.push({ t, f0: GV.midiToFreq(н.midi + октава) * Math.pow(2, центы / 1200), rms: 0.1 });
  }
  return кадры;
}
{
  const события = GV.trackNotes(синтПение(песня));
  const р = GV.score(песня, события);
  ok(р.score === 10000 && р.grade === 'ИДЕАЛЬНО', 'эталон: идеальное пение → ' + р.score + ' ' + р.grade);
}
/* ── 5. Октаво-инвариантность: своей октавой — честно зачтено ── */
{
  const база = GV.score(песня, GV.trackNotes(синтПение(песня))).score;
  const вверх = GV.score(песня, GV.trackNotes(синтПение(песня, { октава: 12 }))).score;
  const вниз = GV.score(песня, GV.trackNotes(синтПение(песня, { октава: -12 }))).score;
  ok(база === вверх && база === вниз, 'октаво-инвариантность: ±12 полутонов → тот же счёт (' + база + ')');
}
/* ── 6. Ступени: perfect ≤50ц → 100%, good ≤100ц → 75%, ok ≤200ц → 50% ── */
{
  const нота = { bpm: 120, notes: [{ t0: 0, t1: 1, dur: 1, midi: 69, golden: false }], lines: [] };
  const s50 = GV.score(нота, событиеИзОшибки(50)).score;
  const s100 = GV.score(нота, событиеИзОшибки(100)).score;
  const s200 = GV.score(нота, событиеИзОшибки(200)).score;
  ok(s50 === 10000, 'ступень perfect (50ц) → 10000, факт: ' + s50);
  ok(s100 === 7500, 'ступень good (100ц) → 7500 (75%), факт: ' + s100);
  ok(s200 === 5000, 'ступень ok (200ц) → 5000 (50%), факт: ' + s200);
  const s201 = GV.score(нота, событиеИзОшибки(201)).score;
  ok(s201 === 0, 'за порогом ok (201ц) → 0, факт: ' + s201);
}
/* ── 7. Золотые ноты ×2 ── */
{
  const обычная = { bpm: 120, notes: [{ t0: 0, t1: 1, dur: 1, midi: 69, golden: false }], lines: [] };
  const золотая = { bpm: 120, notes: [{ t0: 0, t1: 1, dur: 1, midi: 69, golden: true }], lines: [] };
  const событие = [{ t0: 0, t1: 1, midi: 69 }];
  const рОб = GV.score(обычная, событие), рЗо = GV.score(золотая, событие);
  ok(рЗо.perNote[0].max === рОб.perNote[0].max * 2, 'золотая нота весит ×2 (' + рЗо.perNote[0].max + ' против ' + рОб.perNote[0].max + ')');
}
/* ── 8. Бонус строки ── */
{
  const две = { bpm: 120, lines: [{ t0: 0, t1: 1 }, { t0: 2, t1: 3 }],
    notes: [{ t0: 0, t1: 1, dur: 1, midi: 69, golden: false, line: 0 },
            { t0: 2, t1: 3, dur: 1, midi: 71, golden: false, line: 1 }] };
  const всеЧисто = GV.score(две, [{ t0: 0, t1: 1, midi: 69 }, { t0: 2, t1: 3, midi: 71 }]);
  ok(всеЧисто.lines.every(L => L.bonus === 1000), 'бонус строки +1000, когда вся строка спета');
  const сПромахом = GV.score(две, [{ t0: 0, t1: 1, midi: 69 }, { t0: 2, t1: 3, midi: 80 }]);
  ok(сПромахом.lines[1].bonus === 0 && сПромахом.lines[0].bonus === 1000, 'промах в строке убивает только её бонус');
}
/* ── 9. Тональность Крумхансл–Шмуклер + честный margin ── */
{
  const до_мажор = [60, 62, 64, 65, 67, 69, 71, 72].map(m => ({ midi: m, dur: 4 }));
  const ключ = GV.detectKey(до_мажор);
  ok(ключ.tonic === 0 && ключ.mode === 'major' && ключ.margin > 0, 'тональность: ' + ключ.name + ' (margin ' + ключ.margin.toFixed(3) + ')');
  const скудная = GV.detectKey([{ midi: 60, dur: 1 }, { midi: 62, dur: 1 }]);
  ok(typeof скудная.margin === 'number' && скудная.margin < ключ.margin, 'скудная мелодия — margin честно мал (' + скудная.margin.toFixed(3) + ')');
}
/* ── 10. Трекер: гистерезис 60ц, соседние полутоны не слипаются ── */
{
  const ровно = [];
  for (let t = 0; t < 1; t += 0.01) {
    const джиттерЦентов = ((t * 100) | 0) % 2 === 0 ? 30 : -30; /* ±30ц — внутри гистерезиса 60ц */
    ровно.push({ t, f0: GV.midiToFreq(69) * Math.pow(2, джиттерЦентов / 1200), rms: 0.1 });
  }
  const событияРовно = GV.trackNotes(ровно.map(ф => ({ t: ф.t, f0: ф.f0 * 1.0, rms: 0.1 })));
  ok(событияРовно.length === 1, 'джиттер в пределах 60ц → одно событие (' + событияРовно.length + ')');
  const лестница = [];
  const высоты = [60, 62, 64, 71];
  for (let i = 0; i < высоты.length; i++)
    for (let t = i * 0.5; t < (i + 1) * 0.5; t += 0.01) лестница.push({ t, f0: GV.midiToFreq(высоты[i]), rms: 0.1 });
  const события = GV.trackNotes(лестница);
  ok(события.length === 4, 'ре-ми-до-си (соседние полутоны) → 4 события, не слиплись (' + события.length + ')');
  ok(почти(события[0].midi, 60, 0.5) && почти(события[3].midi, 71, 0.5), 'высоты событий честные');
}
/* ── 11. DTW-заготовка жива ── */
{
  const d = GV.dtw([0, 1, 2, 3], [0, 1, 2, 3], 2);
  ok(d.cost === 0 && d.pathLen > 0, 'DTW: одинаковый контур → стоимость 0');
}

console.log(fail === 0 ? '\nALL GOLDEN VOICE OK (' + pass + '/' + (pass + fail) + ')' : '\nПРОВАЛЫ: ' + fails.join(' | '));
process.exit(fail === 0 ? 0 : 1);
