/* Тест слоя ЖИЗНЬ / SUSTAINABILITY (v1.26): деньги = территория человека.
   Честность слоя проверяется машиной: прототип без рельсов, schema валидна,
   страница — зеркало funding.json, граница GOVERNANCE на месте, офлайн-автономность.
   Запуск: node --test ИНСТРУМЕНТЫ/test_sustainability_logic.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const СЛОЙ = join(КОРЕНЬ, 'ДОКУМЕНТЫ', 'SUSTAINABILITY');
const ф = (п) => readFileSync(join(СЛОЙ, п), 'utf-8');

const FUNDING = JSON.parse(ф('funding.json'));
const SCHEMA = JSON.parse(ф('schema.json'));
const LEDGER = JSON.parse(ф('ledger.example.json'));
const СТРАНИЦА = readFileSync(join(КОРЕНЬ, 'ДОКУМЕНТЫ', 'ПОДДЕРЖАТЬ.html'), 'utf-8');
const GOV = ф('GOVERNANCE.md');
const POLICY = ф('FUNDING_POLICY.md');
const TRANS = ф('TRANSPARENCY.md');
const GRANT = ф('GRANT_READINESS.md');
const README = ф('README.md');

/* ---------- мини-валидатор JSON Schema (draft-07 подмножество, без зависимостей) ---------- */
function валидно(д, схема, путь = '$') {
  const ошибки = [];
  const п = (текст) => ошибки.push(путь + ': ' + текст);
  if (схема.const !== undefined && д !== схема.const) п('не const ' + JSON.stringify(схема.const));
  if (схема.enum !== undefined && !схема.enum.includes(д)) п('не из enum');
  if (схема.type === 'object') {
    if (typeof д !== 'object' || д === null || Array.isArray(д)) { п('не object'); return ошибки; }
    for (const т of схема.required || []) if (!(т in д)) п('нет required ' + т);
    if (схема.additionalProperties === false) {
      for (const к of Object.keys(д)) if (!(к in (схема.properties || {}))) п('лишнее свойство ' + к);
    }
    for (const [к, с] of Object.entries(схема.properties || {})) {
      if (к in д) ошибки.push(...валидно(д[к], с, путь + '.' + к));
    }
  } else if (схема.type === 'array') {
    if (!Array.isArray(д)) { п('не array'); return ошибки; }
    if (схема.minItems !== undefined && д.length < схема.minItems) п('мало items');
    if (схема.maxItems !== undefined && д.length > схема.maxItems) п('много items');
    (схема.items ? д : []).forEach((э, i) => ошибки.push(...валидно(э, схема.items, путь + '[' + i + ']')));
  } else if (схема.type === 'integer') {
    if (!Number.isInteger(д)) п('не integer');
    if (схема.minimum !== undefined && д < схема.minimum) п('меньше minimum');
  } else if (схема.type === 'string') {
    if (typeof д !== 'string') п('не string');
    else {
      if (схема.minLength !== undefined && д.length < схема.minLength) п('короче minLength');
      if (схема.pattern && !new RegExp(схема.pattern).test(д)) п('не по pattern');
    }
  }
  if (схема.maxProperties !== undefined && Object.keys(д || {}).length > схема.maxProperties) п('больше maxProperties');
  return ошибки;
}

test('funding.json: статус честный — прототип БЕЗ рельсов, rails пуст', () => {
  assert.equal(FUNDING.schema, 'singulyar-funding/v0.1');
  assert.equal(FUNDING.status, 'PROTOTYPE_NO_RAILS');
  assert.deepEqual(FUNDING.rails, {}, 'ни одной рельсы: активация — решение владельца');
});

test('funding.json: валиден против schema.json (мини-валидатор, if/then)', () => {
  const ошибки = валидно(FUNDING, SCHEMA);
  assert.deepEqual(ошибки, [], 'нарушения схемы: ' + ошибки.join('; '));
  // if/then вручную: прототип → rails maxProperties 0
  if (FUNDING.status === 'PROTOTYPE_NO_RAILS') assert.ok(Object.keys(FUNDING.rails).length === 0);
});

test('funding.json: пять канонических уровней и суммы канона', () => {
  assert.deepEqual(FUNDING.tiers.map(t => t.id), ['friend', 'supporter', 'accessibility', 'infrastructure', 'partner']);
  assert.deepEqual(FUNDING.tiers.map(t => t.amount), [3, 10, 25, 100, 500]);
  assert.deepEqual(FUNDING.tiers.map(t => t.currency), Array(5).fill('EUR'));
  for (const t of FUNDING.tiers) assert.ok(t.description.length > 0, t.id + ': описание обязательно');
});

test('funding.json: принципы не подменены (граница GOVERNANCE в данных)', () => {
  assert.deepEqual([...FUNDING.principles].sort(), [
    'accessibility_is_not_premium', 'no_user_data_sales', 'person_chooses_system_adapts',
    'public_claims_require_evidence', 'sponsor_does_not_own_roadmap'
  ].sort());
});

test('funding.json: цели финансируют РЕЗУЛЬТАТ (deliverables), не платежи', () => {
  assert.ok(FUNDING.goals.length >= 1);
  for (const g of FUNDING.goals) {
    assert.ok(g.deliverables.length >= 1, g.id + ': результат обязателен');
    assert.equal(g.status, 'PLANNED');
    assert.equal(g.currency, 'EUR');
  }
  const пк = FUNDING.goals.find(g => g.id === 'accessibility-test-pack');
  assert.ok(пк, 'цель accessibility test pack объявлена');
  assert.ok(пк.deliverables.some(d => /published result report/i.test(d)), 'публикация отчёта — часть результата');
});

test('ledger.example.json: демо помечено как демо, цепочка на месте', () => {
  assert.equal(LEDGER.status, 'DEMO');
  assert.match(LEDGER.warning, /NOT REAL FINANCIAL DATA/);
  for (const з of LEDGER.entries) {
    assert.ok('prev_hash' in з && 'hash' in з, 'append-only поля обязаны быть');
    assert.equal(з.evidence.level, 'DEMO');
  }
});

test('ПОДДЕРЖАТЬ.html: честный статус — не платёжный процессор, данные не вводить', () => {
  assert.match(СТРАНИЦА, /не является платёжным процессором/);
  assert.match(СТРАНИЦА, /Не вводите платёжные данные/);
  assert.match(СТРАНИЦА, /рельсы не подключены/i);
});

test('ПОДДЕРЖАТЬ.html: НИ ОДНОЙ рельсы — ни кнопки оплаты, ни адреса, ни ключа (УГОЛОК: allowlist фонда)', () => {
  /* v1.26.5 «ЛАДОНЬ · УГОЛОК»: прямые двери официальному фонду имени Хелен Келлер —
     единственное честное исключение (мимо чужих дядь за проценты). Всё остальное — запрещено. */
  const ДОПУСТИМО = /^https:\/\/(www\.)?(hki\.org|helenkellerfoundation\.org)\//;
  const запрещённое = [
    /sponsors\//i, /paypal/i, /stripe/i, /patreon/i, /opencollective/i,
    /webmoney/i, /yoomoney/i, /lnbc/i, /lightning:/i,
    /\bbc1[a-z0-9]{8,}/i, /\b0x[a-f0-9]{20,}/i, /checkout/i
  ];
  for (const р of запрещённое) assert.equal(р.test(СТРАНИЦА), false, 'запрещённый след на странице: ' + р);
  for (const р of запрещённое) assert.equal(р.test(JSON.stringify(FUNDING)), false, 'запрещённый след в funding.json: ' + р);
  const внешние = СТРАНИЦА.match(/href="https?:\/\/([^"]+)/g) || [];
  for (const ссылка of внешние) {
    const у = ссылка.slice(6);
    const ок = у.startsWith('https://github.com/rtynbirf/singulyar') || ДОПУСТИМО.test(у);
    assert.ok(ок, 'внешняя ссылка вне allowlist: ' + у);
  }
  /* /donate-след допустим ТОЛЬКО внутри допустимых доменов фонда */
  for (const м of СТРАНИЦА.match(/https?:\/\/[^"'\s<>]*donate[^"'\s<>]*/g) || []) {
    assert.ok(ДОПУСТИМО.test(м), 'donate-ссылка вне доменов фонда: ' + м);
  }
});

test('ПОДДЕРЖАТЬ.html: зеркало данных == funding.json (уровни, суммы, цели)', () => {
  const м = СТРАНИЦА.match(/const FUNDING_MIRROR = (\{[\s\S]*?\n\});/);
  assert.ok(м, 'FUNDING_MIRROR найден');
  const зеркало = JSON.parse(м[1]);
  assert.equal(зеркало.status, FUNDING.status);
  assert.deepEqual(зеркало.rails, FUNDING.rails);
  assert.deepEqual(зеркало.tiers.map(t => [t[0], t[2]]), FUNDING.tiers.map(t => [t.id, t.amount]));
  assert.deepEqual(зеркало.goals.map(g => [g[0], g[2]]), FUNDING.goals.map(g => [g.id, g.target]));
  for (const t of зеркало.tiers) {
    const кан = FUNDING.tiers.find(x => x.id === t[0]);
    assert.equal(t[3], кан.title, 'заголовок уровня совпадает');
    assert.equal(t[4], кан.description, 'описание уровня совпадает');
  }
});

test('ПОДДЕРЖАТЬ.html: автономна офлайн — без внешних ресурсов и сети', () => {
  /* v1.37.0: локальный скрипт движка (шестерёнка — закон дома) разрешён;
     запрещены только ВНЕШНИЕ ресурсы и сетевые вызовы */
  assert.equal(/<script[^>]+src=["']https?:/i.test(СТРАНИЦА), false, 'внешних скриптов нет');
  assert.equal(/<link[^>]+href="https?:/i.test(СТРАНИЦА), false, 'внешних стилей нет');
  assert.equal(/<(img|iframe|source|embed)[^>]+src=["']https?:/i.test(СТРАНИЦА), false, 'внешних медиа нет');
  assert.equal(/fetch\(|XMLHttpRequest|import\(/.test(СТРАНИЦА), false, 'сетевых вызовов нет');
  assert.match(СТРАНИЦА, /person_chooses|PERSON CHOOSES/i, 'принцип на странице');
});

test('GOVERNANCE.md: инварианты S01–S10 на месте', () => {
  for (let i = 1; i <= 10; i++) {
    assert.ok(new RegExp('S0?' + i + '\\s*[—-]').test(GOV) || new RegExp('\\*\\*S0?' + i + '\\*\\*').test(GOV),
      'инвариант S' + i + ' найден');
  }
  assert.match(GOV, /Деньги не получают права собственности на roadmap/);
  assert.match(GOV, /PERSON CHOOSES/);
});

test('FUNDING_POLICY.md: не продаётся никогда + уровни канона', () => {
  assert.match(POLICY, /Что не продаётся никогда/);
  assert.match(POLICY, /accessibility/);
  for (const ур of ['FRIEND', 'SUPPORTER', 'ACCESSIBILITY', 'INFRASTRUCTURE', 'PARTNER']) {
    assert.ok(POLICY.includes(ур), 'уровень ' + ур + ' в политике');
  }
  assert.match(POLICY, /ШАБЛОН \(не активирован\)/, 'FUNDING.yml существует только как шаблон');
});

test('TRANSPARENCY.md: append-only, correction, уровни evidence', () => {
  assert.match(TRANS, /Нельзя молча редактировать/);
  assert.match(TRANS, /correction/);
  for (const у of ['DEMO', 'SELF_REPORTED', 'PLATFORM', 'RECEIPT', 'AUDITED']) assert.ok(TRANS.includes(у));
  assert.match(TRANS, /SELF_REPORTED ≠ EVIDENCE/);
  assert.match(TRANS, /demo ledger за реальный|demo ledger/);
});

test('GRANT_READINESS.md: не обещает грант, Horizon-заметка честная', () => {
  assert.match(GRANT, /не обещать грант/i);
  assert.match(GRANT, /Horizon Europe/);
  assert.match(GRANT, /не является заявкой/);
});

test('README слоя: статус честный, происхождение сигнала указано', () => {
  assert.match(README, /PAYMENT_RAILS_CONNECTED: \*\*нет\*\*/);
  assert.match(README, /PROTOTYPE: \*\*да\*\*/);
  assert.match(README, /Никаких API-ключей/);
  assert.match(README, /DOOM-такт/);
});

test('страница и слой: governance-пять на странице (те же слова, что в документе)', () => {
  const ожидания = ['Accessibility не является PRO-функцией', 'Спонсор не получает права менять roadmap',
    'Данные пользователей не продаются', 'должны иметь evidence', 'новая запись, а не тихое редактирование'];
  for (const о of ожидания) assert.ok(СТРАНИЦА.includes(о), 'на странице: ' + о);
});

test('УГОЛОК 17: allowlist ВСЕХ https-строк funding.json — чужая касса в слой не пролезет (v1.26.5)', () => {
  const ДОПУСТИМО = /^https:\/\/(www\.)?(hki\.org|helenkellerfoundation\.org)\//;
  const строки = JSON.stringify(FUNDING).match(/https:\/\/[^"\\]+/g) || [];
  assert.ok(строки.length >= 2, 'двери фонда в funding.json объявлены');
  for (const у of строки) assert.ok(ДОПУСТИМО.test(у), 'https-строка вне allowlist фонда: ' + у);
  /* рельсы при этом обязаны остаться пустыми (if/then) */
  if (FUNDING.status === 'PROTOTYPE_NO_RAILS') assert.deepEqual(FUNDING.rails, {});
});

test('УГОЛОК 18: скромненько в уголочке — зеркало↔funding.json, обе двери, не по билету (v1.26.5)', () => {
  assert.ok(FUNDING.fund_corner, 'fund_corner в funding.json');
  const м = СТРАНИЦА.match(/const FUNDING_MIRROR = (\{[\s\S]*?\n\});/);
  const зеркало = JSON.parse(м[1]);
  assert.equal(зеркало.fund_corner.id, FUNDING.fund_corner.id, 'зеркало уголка: id совпадает');
  assert.deepEqual(зеркало.fund_corner.doors.map(d => d[0]), FUNDING.fund_corner.doors.map(d => d.url),
    'зеркало уголка: обе двери совпадают с funding.json');
  /* обе двери — буквальными ссылками на странице (работают офлайн-навигацией и без JS) */
  for (const д of FUNDING.fund_corner.doors) assert.ok(СТРАНИЦА.includes('href="' + д.url + '"'), 'дверь на странице: ' + д.url);
  /* честные слова владельца */
  assert.match(СТРАНИЦА, /не по билету/);
  assert.match(СТРАНИЦА, /ни процента/);
  assert.match(СТРАНИЦА, /Кто дал — дал, кто не дал — не дал/);
  /* скромное положение: уголок ПОСЛЕ главных разделов, не лобное место */
  const уголок = СТРАНИЦА.indexOf('уголок-фонда');
  const оглав = СТРАНИЦА.indexOf('<h2>Поддержка</h2>');
  assert.ok(уголок > оглав > 0 && уголок > СТРАНИЦА.indexOf('Governance'), 'уголок стоит скромно, после основного');
});
