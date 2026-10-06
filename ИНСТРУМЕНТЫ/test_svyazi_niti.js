/* ═══ ТЕСТ ЖИВОЙ НИТИ (node --test ИНСТРУМЕНТЫ/test_svyazi_niti.js) ═══
   Такт v1.39.0 «ЖИВАЯ НИТЬ»: связи дверей в манифесте — истина; память
   пути — append-only и ничего не запирает (Human-First).
   Запуск: node --test ИНСТРУМЕНТЫ/test_svyazi_niti.js */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const КОД_ЯДРА = fs.readFileSync(path.join(ROOT, 'singulyar-modules.js'), 'utf8');

/* ядро грузится в песочнице с минимальными window/document — как в браузере */
function ядро(pathname) {
  const sandbox = {
    window: {}, navigator: {}, location: { pathname: pathname || '/index.html' },
    document: {
      readyState: 'complete',
      querySelector: () => null,
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, removeAttribute() {}, classList: { add() {} } }),
      createElementNS: () => ({ style: {}, setAttribute() {}, appendChild() {}, firstChild: null, removeChild() {} }),
      insertBefore() {},
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

/* ── 1. версии и место ── */
test('ядро v1.5.0 несёт ЖИВУЮ НИТЬ: API на месте', () => {
  const SNG = ядро();
  assert.equal(SNG.версия, '1.5.0');
  for (const имя of ['связи', 'визит', 'визиты', 'путь', 'нитьПрогресс'])
    assert.equal(typeof SNG[имя], 'function', 'API нити: ' + имя);
});

/* ── 2. связи: манифест — истина ── */
test('связей 20; все пары уникальны, симметричны, ведут на живые двери, без петель', () => {
  const SNG = ядро();
  const нити = SNG.связи();
  assert.equal(нити.length, 20, 'нитей: ' + нити.length);

  const ключи = new Set();
  for (const п of нити) {
    const ключ = [п.от, п.к].sort().join('·');
    assert.ok(!ключи.has(ключ), 'пара уникальна: ' + ключ);
    ключи.add(ключ);
    assert.notEqual(п.от, п.к, 'без петель: ' + ключ);
    assert.ok(SNG.поId(п.от), 'от — живая дверь: ' + п.от);
    assert.ok(SNG.поId(п.к), 'к — живая дверь: ' + п.к);
    /* симметрия: манифест обязан держать связь в обе стороны */
    const обрат = SNG.поId(п.к).связи || [];
    assert.ok(обрат.includes(п.от), 'симметрия ' + ключ);
  }
  /* известные нити — мост ·21⇄·22 (написан в манифесте) и хребет ·27→·28→·29 */
  assert.ok(ключи.has('s21·s22'), 'мост ·21⇄·22');
  assert.ok(ключи.has('s27·s28') && ключи.has('s28·s29') && ключи.has('s27·s29'), 'хребет фундамент—узел—свобода');
  /* каждая дверь связана хотя бы одной нитью — дом не рассыпается */
  for (const м of SNG.модуль) {
    if (м.id === 'хаб') continue;
    assert.ok((м.связи || []).length >= 1, 'дверь связана: ' + м.id);
  }
});

/* ── 3. визиты: append-only, хаб не дверь ── */
test('визит пишет первое касание; повтор не перезаписывает; хаб не считается', () => {
  const SNG = ядро();
  assert.equal(SNG.визит('s01'), true, 'первое касание записано');
  assert.equal(SNG.визит('s01'), false, 'повтор не перезаписывает (append-only)');
  assert.equal(SNG.визит('хаб'), false, 'хаб — лицо, не дверь');
  assert.equal(SNG.визит('нет_такой'), false, 'чужой id не записывается');
  const виз = SNG.визиты();
  assert.equal(Object.keys(виз).length, 1);
  assert.ok(!Number.isNaN(Date.parse(виз.s01)), 'момент касания — ISO-время');
  /* копия, не ссылка: чужой код не портит память пути */
  виз.s15 = 'взлом';
  assert.ok(!SNG.визиты().s15, 'визиты() отдаёт копию');
});

/* ── 4. путь и прогресс ── */
test('путь хранит порядок первых касаний; прогресс считает двери и живые нити', () => {
  const SNG = ядро();
  assert.equal(SNG.путь().length, 0, 'в начале путь пуст');
  SNG.визит('s21');
  SNG.визит('s15');
  SNG.визит('s22');
  assert.deepEqual([...SNG.путь()], ['s21', 's15', 's22'], 'порядок касаний сохранён');

  const п1 = SNG.нитьПрогресс();
  assert.equal(п1.всего, 18, 'всего 18 дверей');
  assert.equal(п1.пройдено, 3, 'пройдено 3');
  assert.equal(п1.нитей, 20);
  assert.equal(п1.нитейЖивых, 1, 'жива одна нить: ·21⇄·22');

  SNG.визит('s28');
  const п2 = SNG.нитьПрогресс();
  assert.equal(п2.нитейЖивых, 1, 's28 без пары: живых нитей не прибавилось');
  SNG.визит('s19');
  /* зажглись: ·21⇄·22, ·19⇄·28 и ·19⇄·21 — все пары касались */
  assert.equal(SNG.нитьПрогресс().нитейЖивых, 3, 'три живые нити');
});

/* ── 5. комната сама помечает первое касание ── */
test('визитКомнаты: ядро отмечает дверь при загрузке комнаты, на хабе — нет', () => {
  const наХабе = ядро('/index.html');
  assert.equal(наХабе.путь().length, 0, 'хаб визитов не пишет');

  const вКомнате = ядро('/СИНГУЛЯР_22_СВЯЗЬ.html');
  assert.deepEqual([...вКомнате.путь()], ['s22'], 'комната ·22 записала своё касание');
});

/* ── 6. нить на лице дома: svg-слой и рисование ── */
test('движок осколков строит svg-нить; офлайн-закон: литералов протокола в исходнике нет', () => {
  assert.ok(КОД_ЯДРА.includes('нить-между-осколками'), 'класс svg-слоя нити');
  assert.ok(КОД_ЯДРА.includes('нитьРисовать'), 'перерисовка нити');
  assert.ok(КОД_ЯДРА.includes('нитьФокус'), 'фокус нитей при наведении');
  assert.ok(КОД_ЯДРА.includes('визитКомнаты'), 'авто-визит комнат');
  /* офлайн-закон (тест №3 ядра распространяется и на нить) */
  assert.ok(!/https?:\/\//.test(КОД_ЯДРА), 'нет http/https-литералов');
  assert.ok(!/\bfetch\s*\(/.test(КОД_ЯДРА), 'нет fetch');
  assert.ok(КОД_ЯДРА.includes("singulyar-нить-v1"), 'ключ хранения памяти пути');
});
