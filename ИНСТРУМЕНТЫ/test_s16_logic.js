/* Мини-тест логики ·16 без DOM: шина, парсер UltraStar, LRC, round-trip */
const fs = require('fs');
const src = fs.readFileSync('/tmp/s16.js', 'utf8');
const grab = (re) => src.match(re)[0];
const busCode = grab(/class SingulyarEventBus \{[\s\S]*?\n\}/);
const parserCode = grab(/class SingulyarNoteChart \{[\s\S]*?\n\}(?=\n\/\* ── 4)/);
const code = busCode + '\n' + parserCode + '\nmodule.exports = { SingulyarEventBus, SingulyarNoteChart };';
fs.writeFileSync('/tmp/s16_classes.js', code);
const { SingulyarEventBus, SingulyarNoteChart } = require('/tmp/s16_classes.js');

let fails = 0;
const check = (name, cond) => { console.log(name + ':', cond ? 'OK' : 'FAIL'); if (!cond) fails++; };

const bus = new SingulyarEventBus();
let got = 0; bus.on('X', () => got++);
bus.emit('X', {}); bus.emit('Y', {});
check('bus', got === 1);

const p = new SingulyarNoteChart();
const notes = p.parseUltraStar('#BPM:120\n#GAP:500\n: 10 4 0 Привет\n* 20 8 5 мир\nE');
check('parser', notes.length === 2 && notes[0].start.toFixed(3) === '1.750' && notes[0].word === 'Привет' && notes[1].type === 'GOLDEN');

const p2 = new SingulyarNoteChart();
p2.parseUltraStar('#BPM:120\n: 10 4 0 Привет\n* 20 8 5 мир\nE');
const txt = p2.toUltraStar(120);
const p3 = new SingulyarNoteChart();
const back = p3.parseUltraStar(txt);
check('roundtrip', back.length === 2 && back[0].pitch === 60 && back[1].pitch === 65);

const lrc = p.parseLRC('[00:05.00] когда теряем\n[00:12.50] всё сразу');
check('lrc', lrc.length === 2 && lrc[0].t === 5 && lrc[1].t === 12.5);

/* сегментатор и форматтер экстрактора на синтетике */
const segCode = grab(/segmentPitchTimeline\(timeline\) \{[\s\S]*?\n    \}/);
const fmtCode = grab(/formatToNoteChart\(rawNotes\) \{[\s\S]*?\n    \}/);
const extCode = 'class T { constructor(){ this.bpm=120; } ' + segCode + ' ' + fmtCode + ' }\nmodule.exports = T;';
fs.writeFileSync('/tmp/s16_ext.js', extCode);
const T = require('/tmp/s16_ext.js');
const t = new T();
const tl = [{ time: 1.0, midi: 60 }, { time: 1.05, midi: 60 }, { time: 1.1, midi: 60 },
            { time: 1.15, midi: null }, { time: 1.2, midi: 64 }, { time: 1.25, midi: 64 }];
const raw = t.segmentPitchTimeline(tl);
const fc = t.formatToNoteChart(raw);
check('segmenter', raw.length === 1 && raw[0].midi === 60 && raw[0].end - raw[0].start >= 0.08 && fc.notes[0].pitch === 60 && fc.notes[0].word === '~');

console.log(fails === 0 ? 'ALL LOGIC OK' : fails + ' FAILURES');
process.exit(fails === 0 ? 0 : 1);
