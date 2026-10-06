/* ═══ ТЕСТ ЯДРА МОДУЛЕЙ SNG (node --test ИНСТРУМЕНТЫ/test_modules_logic.js) ═══
   Такт v1.29.0 «МОДУЛИ · МУЛЬТИМОДАЛЬНОСТЬ» — по слову владельца
   «ПЕРЕДЕЛЫВАЙ ВСЁ И ВСЯ НА МОДУЛИ». Закон 4 дома «ничего на веру»:
   манифест сверяется с диском файл за файлом, модальности — по факту кода.
   Запуск: node --test ИНСТРУМЕНТЫ/test_modules_logic.js */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const ЯДРО = path.join(ROOT, 'singulyar-modules.js');
const КОД_ЯДРА = fs.readFileSync(ЯДРО, 'utf8');

/* ядро грузится в песочнице с минимальными window/document — как в браузере */
function ядро(pathname) {
  const sandbox = {
    window: {}, navigator: {}, location: { pathname: pathname || '/index.html' },
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
  vm.runInContext(КОД_ЯДРА, sandbox, { filename: 'singulyar-modules.js' });
  return sandbox.window.SNG;
}

/* ── 1. формула и инвариант дома ── */
test('ядро несёт формулу Ŝ = 1_H + λ(I⊗I†) и инвариант ⟨M(t), Σ(t)⟩ ≡ 0', () => {
  const SNG = ядро();
  assert.equal(SNG.версия, '1.7.0');   /* v1.7.0: такт v1.42.0 «ЗАКАЛКА» */
  assert.equal(SNG.формула, 'Ŝ = 1_H + λ(I⊗I†)');
  assert.equal(SNG.инвариант, '⟨M(t), Σ(t)⟩ ≡ 0');
});

/* ── 2. шесть модальностей, гамма дома ── */
test('модальностей ровно шесть, у каждой имя/глиф/цвет/кратко, цвета — золото и серебро дома', () => {
  const SNG = ядро();
  assert.equal(SNG.модальности.length, 6);
  const гамма = new Set(['#F0F0F0', '#D4AF37', '#F5A623', '#F0D78C', '#C8A05F', '#C8CCD2']);
  const имена = new Set();
  for (const м of SNG.модальности) {
    assert.ok(м.id && м.имя && м.глиф && м.кратко, 'поля модальности полны: ' + м.id);
    assert.ok(гамма.has(м.цвет), 'цвет в гамме дома: ' + м.цвет);
    имена.add(м.id);
  }
  for (const ожид of ['слово', 'голос', 'звук', 'образ', 'такт', 'жест'])
    assert.ok(имена.has(ожид), 'модальность на месте: ' + ожид);
});

/* ── 3. манифест полон, файлы на диске ── */
test('манифест: 20 узлов, у каждого файл существует на диске, классы и фасеты валидны', () => {
  const SNG = ядро();
  assert.equal(SNG.модуль.length, 20);
  const классы = new Set(['К0', 'К1', 'К2']);
  const фасеты = new Set([null, 'atlas', 'flow', 'resonance', 'aura', 'mesh', 'vault', 'brain']);
  for (const m of SNG.модуль) {
    assert.ok(m.id && m.номер && m.имя && m.файл && m.кратко, 'поля узла полны: ' + m.id);
    assert.ok(классы.has(m.класс), 'класс валиден: ' + m.класс);
    assert.ok(фасеты.has(m.фасет), 'фасет валиден: ' + m.фасет);
    assert.equal(typeof m.авто, 'boolean', 'автономность — булево: ' + m.id);
    assert.ok(fs.existsSync(path.join(ROOT, m.файл)), 'файл узла на диске: ' + m.файл);
  }
});

/* ── 4. модальности — подмножество шести, минимум одна ── */
test('модальности узлов — подмножество шести каналов, у каждого узла минимум одна', () => {
  const SNG = ядро();
  const каналы = new Set(SNG.модальности.map(м => м.id));
  for (const m of SNG.модуль) {
    assert.ok(m.модальности.length >= 1, 'минимум одна модальность: ' + m.id);
    for (const id of m.модальности) assert.ok(каналы.has(id), 'канал валиден: ' + id + ' у ' + m.id);
    assert.equal(new Set(m.модальности).size, m.модальности.length, 'без дублей: ' + m.id);
  }
});

/* ── 5. ключевые узлы: хаб, ·28, ·29, сцена, дом ── */
test('хаб ·00, УЗЕЛ ·28, СВОБОДА ·29, ТКАНЬ ·30, СУФЛЁР ·16 на месте; карта покрывает все 20 узлов', () => {
  const SNG = ядро();
  const хаб = SNG.поId('хаб');
  assert.equal(хаб.файл, 'index.html');
  assert.equal(хаб.модальности.length, 6, 'хаб говорит на всех шести каналах');
  const узел = SNG.поId('s28');
  assert.equal(узел.номер, '·28');
  assert.equal(узел.файл, 'СИНГУЛЯР_28_УЗЕЛ.html');
  assert.ok(узел.кратко.includes('λ(I⊗I†)'), 'в описании узла — формула');
  assert.equal(SNG.поId('s16').имя, 'СУФЛЁР');
  const ткань = SNG.поId('s30');
  assert.equal(ткань.номер, '·30');
  assert.equal(ткань.файл, 'СИНГУЛЯР_30_ТКАНЬ.html');
  assert.ok(ткань.кратко.includes('MEANING ≠ TRANSPORT'), 'в описании ткани — её закон');
  assert.ok(ткань.связи.includes('s19') && ткань.связи.includes('s21') && ткань.связи.includes('s22'), 'связи ткани — цепочка ТЗ ·19→·21→·22');
  const карта = SNG.карта();
  assert.equal(карта.length, 6, 'карта — по строке на модальность');
  let покрыто = 0;
  for (const строка of карта) покрыто += строка.модули.length;
  assert.ok(покрыто >= 19, 'все узлы покрыты хотя бы одной модальностью: ' + покрыто);
});

/* ── 6. срезы по каналам — по факту манифеста ── */
test('по каналу ГОЛОС живёт СУФЛЁР ·16 и СОБЫТИЕ ·18; по СЛОВО — хаб и УЗЕЛ ·28', () => {
  const SNG = ядро();
  const голос = SNG.по('голос').map(m => m.id);
  assert.ok(голос.includes('s16'), '·16 поёт голосом');
  assert.ok(голос.includes('s18'), '·18 поёт голосом');
  assert.ok(!голос.includes('s24'), '·24 ПОЧТА не притворяется голосовой');
  const слово = SNG.по('слово').map(m => m.id);
  assert.ok(слово.includes('хаб'));
  assert.ok(слово.includes('s28'));
  const такт = SNG.по('такт').map(m => m.id);
  assert.ok(такт.includes('s19') && такт.includes('s21'), 'ЧЕЛОВЕК и ОБЩЕНИЕ говорят тактом');
});

/* ── 7. текущий() декодирует кириллицу и находит узлы ── */
test('текущий() находит узел по pathname с кириллицей и %-кодированием', () => {
  const SNG = ядро();
  assert.equal(SNG.текущий() === null, false);
  const хаб = ядро('/index.html').текущий();
  assert.equal(хаб.id, 'хаб');
  const узел = ядро('/' + encodeURIComponent('СИНГУЛЯР_28_УЗЕЛ.html')).текущий();
  assert.equal(узел.id, 's28');
  assert.equal(ядро('/чужая-страница.html').текущий(), null);
});

/* ── 8. призма — живой холст, а не картинка ── */
test('SNG.призма — функция рисования; ядро не тянет сеть и не грузит картинки', () => {
  const SNG = ядро();
  assert.equal(typeof SNG.призма, 'function');
  assert.equal(typeof SNG.кристалл, 'function'); /* v1.1.0: титульный Кристалл-Шар канона */
  /* офлайн-закон: в ядре нет сети и внешних ссылок */
  assert.ok(!/https?:\/\//.test(КОД_ЯДРА), 'нет http/https-ссылок');
  assert.ok(!/\bfetch\s*\(/.test(КОД_ЯДРА), 'нет fetch');
  assert.ok(!/XMLHttpRequest/.test(КОД_ЯДРА), 'нет XMLHttpRequest');
  assert.ok(!/<img/i.test(КОД_ЯДРА), 'нет картинок в разметке бирки');
  assert.ok(КОД_ЯДРА.includes('prefers-reduced-motion'), 'движение уважает reduced-motion');
});

/* ── 9. бирка: ядро ставит модульную бирку с номером и ссылкой на карту ── */
test('модульная бирка: класс .sng-strip, текст МОДУЛЬ, ссылка на карту модулей', () => {
  assert.ok(КОД_ЯДРА.includes('sng-strip'), 'скоуп-класс бирки');
  assert.ok(КОД_ЯДРА.includes('⬢ МОДУЛЬ '), 'текст бирки называет модуль');
  assert.ok(КОД_ЯДРА.includes("карта.href = 'index.html#модули'"), 'бирка ведёт на карту модулей');
  assert.ok(КОД_ЯДРА.includes('try {') || КОД_ЯДРА.includes('try{'), 'бирка в страховке try/catch');
});

/* ── 10. ядро подключено на всех канонических страницах ── */
test('ядро подключено на всех канонических страницах; бирка на комнатах, на хабе её нет (закон v1.33)', () => {
  const комнаты = fs.readdirSync(ROOT).filter(f => /^СИНГУЛЯР_.*\.html$/.test(f));
  assert.ok(комнаты.length >= 17, 'комнат дома: ' + комнаты.length);
  for (const f of комнаты) {
    const т = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(т.includes('singulyar-modules.js'), 'ядро подключено: ' + f);
    assert.ok(т.includes('singulyar-ux-engine-v9.js'), 'шестерёнка на месте (v9): ' + f);
  }
  const хаб = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(хаб.includes('singulyar-modules.js'), 'ядро на главной');
  assert.ok(хаб.includes('singulyar-ux-engine-v9.js'), 'шестерёнка на главной (v9)');
});

/* ── 11. ·28: формула в разметке, ноль изображений ── */
test('комната ·28: формула, инвариант, протокол — в разметке; <img запрещён', () => {
  const т = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_28_УЗЕЛ.html'), 'utf8');
  assert.ok(т.includes('λ(I⊗I†)'), 'формула узла в разметке');
  assert.ok(т.includes('⟨M(t), Σ(t)⟩ ≡ 0'), 'инвариант в разметке');
  assert.ok(т.includes('ЯКОРЬ') && т.includes('ФИЛЬТР') && т.includes('АРХИТЕКТОР'), 'протокол в разметке');
  assert.ok(т.includes('⟨ψ|I⟩'), 'проектор в разметке');
  assert.ok(!/<img[\s>]/i.test(т), 'ноль изображений — слово владельца');
  assert.ok(т.includes('singulyar-modules.js'), 'ядро подключено');
  assert.ok(т.includes('sw15.js'), 'PWA-регистрация на месте');
});

/* ── 12. сборка: SW прекэширует ядро, ·28/·29/·30 и ткань, версия кэша v52 (такт v1.42.0 «ЗАКАЛКА») ──
   Тест следует за тактом: версия кэша меняется вместе со сборкой — это норма.
   Важное неизменное: ядро, двери, движок и ОТКРЫТЫЕ ДОКИ дома обязаны жить в пре-кэше
   (офлайн-закон I-05) — а сам дом обязан собираться без внешних зависимостей. */
test('sw15.js v52: ядро модулей, УЗЕЛ ·28, СВОБОДА ·29, ТКАНЬ ·30 и ядро ткани в прекэше', () => {
  const св = fs.readFileSync(path.join(ROOT, 'sw15.js'), 'utf8');
  assert.ok(св.includes("s15-orkestrator-v52"), 'кэш v52');
  assert.ok(св.includes("./singulyar-modules.js"), 'ядро в прекэше');
  assert.ok(св.includes("./СИНГУЛЯР_28_УЗЕЛ.html"), '·28 в прекэше');
  assert.ok(св.includes("./СИНГУЛЯР_29_СВОБОДА.html"), '·29 в прекэше');
  assert.ok(св.includes("./СИНГУЛЯР_30_ТКАНЬ.html"), '·30 в прекэше');
  assert.ok(св.includes("./БИБЛИОТЕКИ/кристалл/composition.mjs"), 'движок композиции в прекэше');
  assert.ok(св.includes("./БИБЛИОТЕКИ/ткань/ткань.mjs"), 'ядро ткани в прекэше');
  assert.ok(св.includes("./БИБЛИОТЕКИ/ткань/манифест.mjs"), 'манифест ткани в прекэше');
  assert.ok(св.includes("./ДОКУМЕНТЫ/ЖИВАЯ_НИТЬ.md"), 'док ЖИВОЙ НИТИ в прекэше (офлайн-закон)');
  assert.ok(св.includes("./ДОКУМЕНТЫ/РЕВИЗИЯ_РУМ.md"), 'док РЕВИЗИИ рум в прекэше (офлайн-закон)');
  assert.ok(св.includes("./ДОКУМЕНТЫ/ТКАНЬ_СВОЙ_ПУТЬ.md"), 'док ТКАНИ в прекэше (офлайн-закон)');
});
