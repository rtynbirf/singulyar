/**
 * Тесты TextPulse (Фаза 1) — 4 гранулярности по данным .harm:
 * строка / слово / слог / фонема (буква). Чистая логика, время в долях.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TextPulse, LEVELS } from '../src/text-pulse.mjs';
import { readFileSync } from 'node:fs';

const DEMO = JSON.parse(readFileSync(new URL('../доки/demo.harm.json', import.meta.url), 'utf8'));

/** Три текстовых маркера демо-события. */
const textMarkers = DEMO.timeline.filter((m) => m.type === 'text');

test('демо-событие содержит ровно 3 текстовых маркера — на них и строим', () => {
  assert.equal(textMarkers.length, 3);
});

test('гранулярности: счёт сегментов по демо-строке «Просто люби»', () => {
  const tp = new TextPulse([textMarkers[0]], { beatsPerLine: 4 });
  const s = tp.stats();
  assert.equal(s.line, 1);
  assert.equal(s.word, 2);   // Просто | люби
  assert.equal(s.syllable, 4); // Про-сто-лю-би
  assert.equal(s.phoneme, 10); // П,р,о,с,т,о,л,ю,б,и
  assert.equal(s.lines, 1);
});

test('at(): строка активна на всём интервале маркера, текст и alt корректны', () => {
  const tp = new TextPulse([textMarkers[0]]); // beat 0, 2 слова × 2 слога × 1 доля = 4 доли
  for (const b of [0, 0.01, 1.999, 3.999]) {
    const line = tp.at(b, 'line');
    assert.ok(line, `на доле ${b} есть строка`);
    assert.equal(line.text, 'Просто люби');
    assert.equal(line.alt, 'Просто люби');
    assert.equal(line.startBeat, 0);
    assert.equal(line.endBeat, 4);
  }
  assert.equal(tp.at(4, 'line'), null, 'конец интервала открыт: на доле 4 строки уже нет');
  assert.equal(tp.at(-0.1, 'line'), null, 'до начала строки нет');
});

test('at(): слово — границы по сумме весов слогов', () => {
  const tp = new TextPulse([textMarkers[0]]);
  assert.equal(tp.at(0, 'word').text, 'Просто');
  assert.equal(tp.at(1.999, 'word').text, 'Просто');
  assert.equal(tp.at(2, 'word').text, 'люби');
  assert.equal(tp.at(2.5, 'word').wordIndex, 1);
  assert.equal(tp.at(0, 'word').wordIndex, 0);
});

test('at(): слог — в том числе с дробной долей (те 0.5 / бя 0.5 / ждут 1)', () => {
  const tp = new TextPulse([textMarkers[1]]); // «Дом где тебя ждут» с beat 4
  assert.equal(tp.at(4, 'syllable').text, 'Дом');
  assert.equal(tp.at(6, 'syllable').text, 'те');
  assert.equal(tp.at(6.4, 'syllable').text, 'те');
  assert.equal(tp.at(6.5, 'syllable').text, 'бя'); // интервал [6.5, 7) — открытый справа
  assert.equal(tp.at(7, 'syllable').text, 'ждут');
  assert.equal(tp.at(7.9, 'syllable').text, 'ждут');
  assert.equal(tp.at(8, 'syllable'), null);
});

test('at(): фонема = графема слога, доля слога делится поровну между буквами', () => {
  const tp = new TextPulse([textMarkers[0]]);
  // слог «Про» занимает доли [0,1): П [0,1/3), р [1/3,2/3), о [2/3,1)
  assert.equal(tp.at(0, 'phoneme').text, 'П');
  assert.equal(tp.at(0.4, 'phoneme').text, 'р');
  assert.equal(tp.at(0.7, 'phoneme').text, 'о');
  assert.equal(tp.at(1.2, 'phoneme').text, 'с'); // «сто» [1,2)
  assert.equal(tp.at(2.1, 'phoneme').text, 'л');
});

test('уровень «letter» (как в ТЗ F2 и оси профиля gran) — это фонема', () => {
  const tp = new TextPulse([textMarkers[0]]);
  assert.equal(tp.at(0.4, 'letter').text, 'р');
  assert.equal(TextPulse.normalizeLevel('letter'), 'phoneme');
  assert.equal(TextPulse.normalizeLevel('word'), 'word');
  assert.throws(() => tp.at(0, 'нот'), TypeError);
});

test('activeAt(): все уровни сразу — заготовка для подсветки', () => {
  const tp = new TextPulse(textMarkers);
  const a = tp.activeAt(2.5);
  assert.equal(a.line.text, 'Просто люби');
  assert.equal(a.word.text, 'люби');
  assert.equal(a.syllable.text, 'лю');
  assert.equal(a.phoneme.text, 'ю');
  assert.equal(a.line.lineIndex, 0);
});

test('смежные маркеры: стык ровный, без щелей и перекрытий (все 3 демо-строки)', () => {
  const tp = new TextPulse(textMarkers);
  const lines = tp.lines();
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((l) => [l.startBeat, l.endBeat]), [[0, 4], [4, 8], [28, 32]]);
  assert.deepEqual(lines.map((l) => l.text), ['Просто люби', 'Дом где тебя ждут', 'Просто люби']);
  for (const level of LEVELS) {
    const segs = tp.range(level, 0, 32).sort((x, y) => x.startBeat - y.startBeat);
    for (let i = 1; i < segs.length; i++) {
      assert.ok(
        segs[i].startBeat >= segs[i - 1].endBeat - 1e-12,
        `${level}: перекрытие сегментов ${i - 1} и ${i}`,
      );
    }
  }
});

test('range(): выборка уровня по окну', () => {
  const tp = new TextPulse(textMarkers);
  assert.equal(tp.range('syllable', 0, 4).length, 4);
  assert.equal(tp.range('word', 0, 32).length, 8); // 2+4+2 слова
  assert.equal(tp.range('line', 8, 28).length, 0, 'между строками тишина (акцент/промпт)');
});

test('расшифровка (F5): доступна без темпа и без запуска, текст совпадает с alt', () => {
  const tp = new TextPulse(textMarkers);
  const tr = tp.transcript();
  assert.deepEqual(tr.map((x) => x.beat), [0, 4, 28]);
  assert.deepEqual(tr.map((x) => x.text), ['Просто люби', 'Дом где тебя ждут', 'Просто люби']);
  assert.ok(tr.every((x) => typeof x.text === 'string' && x.text.length > 0));
});

test('немедийные маркеры и мусор игнорируются; пустые слова не ломают разметку', () => {
  const mixed = [
    { beat: 0, type: 'scene', data: { scene: 'day' }, alt: 'не текст' },
    { beat: 1, type: 'text', data: { words: [[['Про', 1], ['сто', 1]], [], [['лю', 1], ['би', 1]]] }, alt: 'Пустое слово' },
    null,
    { beat: 9, type: 'text' }, // нет data.words — строка без сегментов не строится
    { beat: 10, type: 'text', data: { words: [] }, alt: 'только alt' },
  ];
  const tp = new TextPulse(mixed);
  const s = tp.stats();
  assert.equal(s.word, 2, 'пустое слово пропущено');
  assert.equal(s.syllable, 4);
  assert.equal(s.line, 2, 'маркер без words не строит строку, words: [] с alt — строит');
  const line = tp.at(1, 'line');
  assert.equal(line.text, 'Просто люби');
  assert.equal(line.alt, 'Пустое слово');
  const altLine = tp.at(10, 'line');
  assert.ok(altLine, 'слова пусты, но alt показывает строкой расшифровки');
  assert.equal(altLine.text, 'только alt');
});

test('время в долях: разметка не зависит от темпа пользователя (beat есть beat)', () => {
  const tp = new TextPulse([textMarkers[1]]);
  // beat 4 + Дом(1) где(1) те(0.5) бя(0.5) ждут(1) → конец на доле 8 независимо от tempo
  assert.equal(tp.at(4.999, 'line').text, 'Дом где тебя ждут');
  assert.equal(tp.at(7.999, 'line').text, 'Дом где тебя ждут');
  assert.equal(tp.at(8, 'line'), null);
  assert.equal(tp.stats().phoneme, 14); // Д,о,м | г,д,е | т,е | б,я | ж,д,у,т = 3+3+2+2+4
});

test('пустой конструктор — валидное пустое состояние', () => {
  const tp = new TextPulse();
  assert.deepEqual(tp.stats(), { lines: 0, line: 0, word: 0, syllable: 0, phoneme: 0 });
  assert.equal(tp.at(0, 'word'), null);
  assert.deepEqual(tp.transcript(), []);
});
