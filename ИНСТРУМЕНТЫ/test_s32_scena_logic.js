#!/usr/bin/env node
/* Тест логики СЦЕНЫ ·32 — закон живёт в коде и доказывается тестом.
   Гоняет ЧИСТОЕ ЯДРО страницы (S32_ЯДРО, вырезанное из живого файла),
   корпус (вшитый), манифест дома (связи симметричны, файл на диске)
   и мост: сообщение сцены обязано пройти живой фильтр двери ·20.
   Запуск: node --test ИНСТРУМЕНТЫ/test_s32_scena_logic.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const страница = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_32_СЦЕНА.html'), 'utf8');

function вырезать(начало, конец) {
  const i = страница.indexOf(начало);
  assert.ok(i >= 0, 'маркер найден: ' + начало);
  const j = страница.indexOf(конец, i);
  assert.ok(j > i, 'закрытие найдено: ' + конец);
  return страница.slice(страница.lastIndexOf('<script>', i) + 8, j);
}

function поВМ(код) {
  const ctx = { window: {}, console, document: { querySelector: () => null, createElement: () => ({ style: {} }) } };
  vm.createContext(ctx);
  vm.runInContext(код, ctx, { timeout: 5000 });
  return ctx;
}

/* ── 1. ядро: разбор строк ── */
test('S32_ЯДРО: веса слов, правило первого слова, сжатие ASR-дыр', () => {
  const ядро = поВМ(вырезать('window.S32_ЯДРО = (function', '</script>')).window.S32_ЯДРО;
  assert.ok(ядро, 'ядро определено');

  const строки = ядро.разобратьСтроки([
    [0.0, '♪ Я набрал дистанцию.'],
    [3.47, 'Я выключил звук.'],
    [6.45, 'очень длинная дыра между строками тянется долго'],
    [40.0, 'конец'],
  ]);
  assert.equal(строки.length, 4);
  /* правило первого слова: строка не молчит после начала */
  assert.equal(строки[0].слова[0].start, 0.0);
  assert.equal(строки[0].слова[0].т, '♪');
  assert.equal(строки[0].слова[1].т, 'Я');
  assert.ok(строки[0].слова[1].start < 0.5, 'слово после маркера близко к началу строки');
  /* слова упорядочены, конец последнего = t1 строки */
  for (const с of строки) {
    for (let w = 0; w < с.слова.length; w++) {
      if (w > 0) assert.ok(с.слова[w].start >= с.слова[w - 1].start - 1e-9, 'слова по времени');
      assert.ok(с.слова[w].end > с.слова[w].start, 'слово длится');
    }
    assert.ok(с.t1 > с.t0, 'строка длится');
  }
  /* ASR-дыра: t1-t0 > 12 сжимается до 12 */
  assert.ok(строки[2].t1 - строки[2].t0 <= 12 + 1e-9, 'дыра сжата: ' + (строки[2].t1 - строки[2].t0));
  /* последняя строка живёт 4 с по умолчанию */
  assert.ok(Math.abs((строки[3].t1 - строки[3].t0) - 4) < 1e-9, 'хвост 4 с');
});

/* ── 2. ядро: окна ТЭП ── */
test('S32_ЯДРО: ИДЕАЛ ±80 мс ×3-база, ТОЧНО по реакции, МИМО обнуляет комбо', () => {
  const ядро = поВМ(вырезать('window.S32_ЯДРО = (function', '</script>')).window.S32_ЯДРО;
  assert.equal(ядро.окна.ИДЕАЛ, 0.080);
  assert.equal(ядро.окна.ТОЧНО, 0.350);

  const идеал = ядро.тэпОценка(0.01, 0);        /* 10 мс — ИДЕАЛ */
  assert.equal(идеал.тип, 'ИДЕАЛ');
  assert.equal(идеал.прибавка, 30);
  assert.equal(идеал.комбо, 1);

  const точно = ядро.тэпОценка(0.2, 0);          /* 200 мс — ТОЧНО */
  assert.equal(точно.тип, 'ТОЧНО');
  assert.ok(точно.прибавка > 10 && точно.прибавка < 30, 'ТОЧНО между базой и ИДЕАЛом: ' + точно.прибавка);

  const мимо = ядро.тэпОценка(0.5, 7);           /* 500 мс — МИМО */
  assert.equal(мимо.тип, 'МИМО');
  assert.equal(мимо.прибавка, 0);
  assert.equal(мимо.комбо, 0, 'комбо в ноль');

  /* комбо-множитель: на 10-м комбо ИДЕАЛ = 30 × 2 = 60 */
  const пик = ядро.тэпОценка(0.0, 10);
  assert.equal(пик.прибавка, 60);
  const за_пиком = ядро.тэпОценка(0.0, 20);      /* дальше ×2 не растёт */
  assert.equal(за_пиком.прибавка, 60);
});

/* ── 3. ядро: ближайшее неспетое ── */
test('S32_ЯДРО: ближайшее неспетое слово — спетое не считается, окно строк ±1', () => {
  const ядро = поВМ(вырезать('window.S32_ЯДРО = (function', '</script>')).window.S32_ЯДРО;
  const строки = ядро.разобратьСтроки([[0, 'раз два три'], [3, 'четыре пять'], [6, 'шесть']]);
  const н = ядро.ближайшееНеспетое(строки, 0.2, 0, 0);
  assert.ok(н && н.строка === 0 && н.инд === 0, 'первое неспетое — начало');
  const н2 = ядро.ближайшееНеспетое(строки, 0.2, 0, 1); /* «раз» спет */
  assert.ok(н2 && н2.инд === 1, 'спетое пропущено');
  const н3 = ядро.ближайшееНеспетое(строки, 5.9, 1, 3); /* строка 0 спета (3 слова) */
  assert.ok(н3 && н3.строка === 2 && н3.инд === 0, 'на 5.9 с ближе всего стартующее «шесть» (6.0) — тап целится в ближайший старт');
  const н4 = ядро.ближайшееНеспетое(строки, 3.1, 1, 3);
  assert.ok(н4 && н4.строка === 1 && н4.инд === 0 && н4.слово.т === 'четыре', 'на 3.1 с целится в «четыре» (3.0)');
});

/* ── 4. корпус: 62 песни, все с текстом, тайминги честные ── */
test('корпус: 62 песни фонда, у всех текст, первые строки не за минутой, ID = минусовкам', () => {
  const ctx = поВМ(вырезать('window.S32_КОРПУС = ', ';\n</script>'));
  const корпус = ctx.window.S32_КОРПУС;
  assert.equal(корпус.songs.length, 62, 'песен в корпусе');
  const minus = new Set(fs.readdirSync(path.join(ROOT, 'minus')).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)));
  for (const п of корпус.songs) {
    assert.ok(п.id && п.title, 'ID и титул есть: ' + п.id);
    assert.ok(minus.has(п.id), 'минусовка на диске: ' + п.id);
    assert.equal(п.has_text, true, 'текст есть: ' + п.id);
    assert.ok(п.lines.length >= 5, 'строк достаточно: ' + п.id + ' = ' + п.lines.length);
    assert.ok(п.lines[0][0] <= 60, 'первая строка в разумной позиции');
  }
  assert.equal(minus.size, 62, 'минусовок на диске ровно 62');
  assert.equal(корпус.meta.схема || корпус.meta.schema, 'ruvson-singulyar-32-scena');
});

/* ── 5. манифест: узел ·32, нити симметричны в обе стороны ── */
test('манифест дома: ·32 на месте, файл на диске, нити симметричны (закон СТАЛИ)', () => {
  const кодЯдра = fs.readFileSync(path.join(ROOT, 'singulyar-modules.js'), 'utf8');
  const sandbox = {
    window: {}, navigator: {}, location: { pathname: '/index.html' },
    document: {
      readyState: 'complete',
      querySelector: () => null,
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, removeAttribute() {} }),
      addEventListener() {},
      head: { appendChild() {} }
    },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame() {}
  };
  sandbox.window.matchMedia = () => ({ matches: true });
  vm.createContext(sandbox);
  vm.runInContext(кодЯдра, sandbox, { filename: 'singulyar-modules.js', timeout: 5000 });
  const SNG = sandbox.window.SNG;
  const сцена = SNG.поId('s32');
  assert.ok(сцена, 'узел s32 есть');
  assert.equal(сцена.номер, '·32');
  assert.equal(сцена.имя, 'СЦЕНА');
  assert.equal(сцена.файл, 'СИНГУЛЯР_32_СЦЕНА.html');
  assert.ok(fs.existsSync(path.join(ROOT, сцена.файл)), 'файл комнаты на диске');
  /* симметрия нитей: каждая связь — дорога в обе стороны */
  for (const m of SNG.модуль) {
    for (const ид of (m.связи || [])) {
      const д = SNG.поId(ид);
      assert.ok(д, 'связь ведёт на существующий узел: ' + m.id + '→' + ид);
      assert.ok((д.связи || []).includes(m.id), 'нить двусторонняя: ' + m.id + '⇄' + ид);
    }
  }
});

/* ── 6. мост: сообщение сцены проходит живой фильтр двери ·20 ── */
test('мост singulyar-hall: STATE сцены проходит фильтр ·20 ФОНЕТИКА без правок', () => {
  const фильтрКод = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_20_ФОНЕТИКА.html'), 'utf8');
  const m = фильтрКод.match(/фильтрМоста = function \(m\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'фильтр ·20 найден в живом файле');
  const ctx = {};
  vm.createContext(ctx);
  const фильтр = vm.runInContext('(' + m[0].replace('фильтрМоста = function', 'function') + ')', ctx);

  /* так вещает сцена (мостВещай): ver=1, t=STATE, src, seq, ts, d */
  const сообщение = { ver: 1, t: 'STATE', src: 's32-abc123', seq: 1, ts: Date.now(), d: { song: 'Когда теряем', word: 'мгновение', next: ['не', 'ждёт'] } };
  assert.equal(фильтр(сообщение), true, 'сцена проходит фильтр ·20');
  assert.equal(фильтр({ ver: 1, t: 'CMD', src: 'x', d: {} }), false, 'чужое не проходит');
});

/* ── 7. страница: канон дома ── */
test('страница ·32: КОРД вшит, innerHTML в рантайме нет, эмодзи-пиктограмм нет, defer-ядро подключено', () => {
  assert.ok(страница.includes('<!--СНГ:КОРД-->'), 'КОРД первым скриптом');
  assert.ok(страница.includes('./singulyar-modules.js'), 'ядро дома подключено');
  assert.ok(страница.includes('./singulyar-ux-engine-v9.js'), 'ux-движок подключен');
  /* innerHTML запрещён каноном дома (КОРД-канон): ловим ИСПОЛЬЗОВАНИЕ, не слово в комментарии */
  const движок = вырезать('СИНГУЛЯР ·32 «СЦЕНА» v1.0.0', '</script>');
  const безКомментариев = движок.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/mg, '');
  assert.ok(!безКомментариев.includes('innerHTML'), 'движок без innerHTML');
  assert.ok(!безКомментариев.includes('outerHTML'), 'движок без outerHTML');
  /* эмодзи-пиктограммы запрещены (Директива-1); глифы канона (♪ ◇ ⬢) — можно */
  const эмодзи = /[\u{1F000}-\u{1FAFF}\u{2700}-\u{27BF}\u{FE0F}]/u;
  const без_корпуса = страница.slice(0, страница.indexOf('window.S32_КОРПУС'));
  assert.ok(!эмодзи.test(без_корпуса), 'разметка и движок без эмодзи');
});
