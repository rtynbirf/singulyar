#!/usr/bin/env node
/* Тест логики КРИСТАЛЛ — протокольное ядро связи. Проверяется РЕАЛЬНЫЙ
   отгруженный модуль БИБЛИОТЕКИ/кристалл/crystal-core.mjs (ESM-импорт,
   не копия) + соответствие schema semantic-event.schema.json.
   Запуск: node --test ИНСТРУМЕНТЫ/test_crystal_logic.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as К from '../БИБЛИОТЕКИ/кристалл/crystal-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const КОРЕНЬ = path.join(__dirname, '..');

const fake = { speechSynthesis: {} };                 /* среда с TTS, без vibrate */
const fakeБез = {};

/* ── 1. Инварианты reference (шесть) ── */

test('смысл события не меняется ни при каком представлении', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'Привет' });
  const р = К.represent(м, { mode: 'braille' });
  assert.equal(р.text, м.semantic.text);
  assert.equal(р.text, 'Привет');
  assert.equal(м.semantic.text, 'Привет');
});

test('явный выбор человека выигрывает, когда возможность есть', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'x' });
  assert.deepEqual(К.chooseRepresentation(м, { explicit: 'tts', preferred: ['text'] }, fake),
    { mode: 'tts', reason: 'human-choice', fallback: false });
});

test('недоступный явный выбор — наблюдаемый fallback, не тихая подмена', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'x', capabilities: ['text', 'tts'] });
  const д = К.chooseRepresentation(м, { explicit: 'tts' }, fakeБез);
  assert.equal(д.mode, 'text');
  assert.equal(д.fallback, true);
  assert.equal(д.reason, 'explicit-choice-unavailable');
});

test('временное событие умирает по TTL', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'x', retention: 'temporary', ttl: 10 });
  м.createdAt = 900;
  assert.equal(К.retentionFilter([м], 1000).length, 0);
  assert.equal(К.retentionFilter([м], 905).length, 1);
});

test('конверт транспорт-нейтрален', () => {
  const е = К.envelope({ type: 'x' }, 'webrtc');
  assert.equal(е.event.type, 'x');
  assert.equal(е.transport, 'webrtc');
  assert.equal(е.type, 'crystal.envelope');
});

test('идемпотентность отбрасывает повтор', () => {
  const seen = new Set();
  const м = К.message({ from: 'a', conversation: 'c', text: 'x', idempotencyKey: 'k' });
  assert.equal(К.applyIdempotent(seen, м).accepted, true);
  assert.equal(К.applyIdempotent(seen, м).reason, 'DUPLICATE');
});

/* ── 2. Машина доставки (protocol/DELIVERY.md) ── */

test('легальная цепочка CREATED→QUEUED→SENT→ACKED→DELIVERED→READ', () => {
  let з = { eventId: 'e1', state: 'CREATED', history: [], attempts: 0 };
  for (const шаг of ['QUEUED', 'SENT', 'ACKED', 'DELIVERED', 'READ']) {
    const р = К.advance(з, шаг);
    assert.equal(р.ok, true, 'переход ' + з.state + '→' + шаг);
    з = р.delivery;
  }
  assert.equal(з.state, 'READ');
  assert.equal(з.history.length, 5);
});

test('нелегальный прыжок отклоняется наблюдаемо (CREATED→READ запрещён)', () => {
  const р = К.advance({ eventId: 'e', state: 'CREATED', history: [], attempts: 0 }, 'READ');
  assert.equal(р.ok, false);
  assert.equal(р.reason, 'ILLEGAL_TRANSITION');
});

test('ACK ≠ READ: из ACKED нельзя прыгнуть в READ', () => {
  const р = К.advance({ eventId: 'e', state: 'ACKED', history: [], attempts: 0 }, 'READ');
  assert.equal(р.ok, false);
});

test('SENT может пройти прямо в DELIVERED (транспорт без ACK-этапа)', () => {
  const р = К.advance({ eventId: 'e', state: 'SENT', history: [], attempts: 0 }, 'DELIVERED');
  assert.equal(р.ok, true);
});

test('путь повторов: SENT→RETRY→QUEUED→SENT, счётчик попыток растёт', () => {
  let з = { eventId: 'e', state: 'SENT', history: [], attempts: 0 };
  let р = К.advance(з, 'RETRY', 'таймаут');
  assert.equal(р.ok, true);
  assert.equal(р.delivery.attempts, 1);
  р = К.advance(р.delivery, 'QUEUED');
  assert.equal(р.ok, true);
  р = К.advance(р.delivery, 'SENT');
  assert.equal(р.ok, true);
  assert.equal(р.delivery.state, 'SENT');
  assert.equal(р.delivery.attempts, 1);          /* попытка не сбрасывается */
});

test('FAILED → QUEUED — легальный ремонт; FAILED не финал-молчанка', () => {
  let р = К.advance({ eventId: 'e', state: 'SENT', history: [], attempts: 0 }, 'FAILED');
  assert.equal(р.ok, true);
  р = К.advance(р.delivery, 'QUEUED', 'ремонт');
  assert.equal(р.ok, true);
});

test('READ — терминальное состояние: из READ никуда', () => {
  const р = К.advance({ eventId: 'e', state: 'READ', history: [], attempts: 0 }, 'SENT');
  assert.equal(р.ok, false);
  assert.deepEqual(К.DELIVERY.LEGAL.READ, []);
});

/* ── 3. Соответствие schema semantic-event.schema.json ── */

test('сгенерированное событие содержит все required-поля схемы с корректными типами', () => {
  const схема = JSON.parse(fs.readFileSync(path.join(КОРЕНЬ, 'БИБЛИОТЕКИ/кристалл/semantic-event.schema.json'), 'utf-8'));
  const м = К.message({ from: 'ПАША', conversation: 'зал-АБВ12', text: 'проверка', retention: 'temporary', ttl: 1000 });
  for (const поле of схема.required) {
    assert.ok(поле in м, 'нет required-поля ' + поле);
  }
  assert.equal(м.type, 'semantic.message');
  assert.ok(м.id.length >= 8, 'id minLength 8');
  assert.ok(м.idempotencyKey.length >= 8);
  assert.ok(Number.isInteger(м.createdAt) && м.createdAt >= 0);
  assert.ok(typeof м.semantic.text === 'string');
  assert.ok(Array.isArray(м.semantic.attachments));
  assert.ok(['persistent', 'temporary'].includes(м.policy.retention));
  assert.ok(м.revision >= 1);
  assert.ok(['string', 'null'].includes(м.semantic.replyTo === null ? 'null' : 'string'));
});

test('message() уважает переданный idempotencyKey (стабильность между повторами)', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'x', idempotencyKey: 'м173-abc' });
  assert.equal(м.idempotencyKey, 'м173-abc');
});

test('вложения не мутируют событие: копия массива', () => {
  const вложения = [{ kind: 'файл', name: 'песня.webm' }];
  const м = К.message({ from: 'a', conversation: 'c', text: 'x', attachments: вложения });
  вложения.push({ kind: 'чужое' });
  assert.equal(м.semantic.attachments.length, 1);
});

/* ── 4. represent по режимам ── */

test('represent: tts несёт голос/темп/тон человека, captions — пунктуацию', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'голос' });
  const т = К.represent(м, { mode: 'tts' }, { voice: 'БАБУШКА', rate: 0.9, pitch: 1.1 });
  assert.deepEqual(т, { ok: true, mode: 'tts', text: 'голос', voice: 'БАБУШКА', rate: 0.9, pitch: 1.1 });
  const с = К.represent(м, { mode: 'captions' }, {});
  assert.equal(с.punctuation, true);
});

test('represent без решения — честный отказ NO_REPRESENTATION', () => {
  const р = К.represent({ semantic: { text: 'x' } }, { mode: null });
  assert.equal(р.ok, false);
  assert.equal(р.error, 'NO_REPRESENTATION');
});

/* ── 5. Совместимость: nobody-поле capabilities ── */

test('неизвестный режим в capabilities сужает выбор честно', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'x', capabilities: ['braille'] });
  const д = К.chooseRepresentation(м, { preferred: ['text'] }, fake);
  /* text не разрешён событием → безопасный fallback недоступен → отказ */
  assert.equal(д.mode, null);
  assert.equal(д.reason, 'no-compatible-representation');
});

test('vibrate отсутствует → tactile недоступен, фолбэк честный', () => {
  const м = К.message({ from: 'a', conversation: 'c', text: 'x' });
  const д = К.chooseRepresentation(м, { explicit: 'tactile', preferred: ['text'] }, { navigator: {} });
  assert.equal(д.mode, 'text');
  assert.equal(д.reason, 'explicit-choice-unavailable');
  assert.equal(д.fallback, true);
});

/* ── 6. Слияние записей доставки (журнал фактов, не слепая перезапись) ── */

test('слияние: DELIVERED применяется к SENT, история не дублируется', () => {
  const ток = { eventId: 'e', state: 'SENT', history: [{ state: 'SENT', at: 1, note: '' }], attempts: 0 };
  const дос = { eventId: 'e', state: 'DELIVERED', history: [{ state: 'DELIVERED', at: 2, note: 'принято' }], attempts: 0 };
  const р = К.mergeDelivery(ток, дос);
  assert.equal(р.ok, true);
  assert.equal(р.delivery.state, 'DELIVERED');
  assert.deepEqual(р.delivery.history.map(h => h.state), ['SENT', 'DELIVERED']);
});

test('слияние: поздний SENT НЕ откатывает DELIVERED (устаревшая запись)', () => {
  const делив = { eventId: 'e', state: 'DELIVERED', history: [{ state: 'DELIVERED', at: 2 }], attempts: 0 };
  const поздний = { eventId: 'e', state: 'SENT', history: [{ state: 'SENT', at: 3 }], attempts: 0 };
  const р = К.mergeDelivery(делив, поздний);
  assert.equal(р.ok, true);
  assert.equal(р.merged, false);
  assert.equal(р.delivery.state, 'DELIVERED');
  assert.equal(р.reason, 'STALE');
});

test('слияние: прыжок вперёд достраивается по цепочке (QUEUED → DELIVERED)', () => {
  const оч = { eventId: 'e', state: 'QUEUED', history: [{ state: 'QUEUED', at: 1 }], attempts: 0 };
  const дос = { eventId: 'e', state: 'DELIVERED', history: [{ state: 'DELIVERED', at: 2 }], attempts: 0 };
  const р = К.mergeDelivery(оч, дос);
  assert.equal(р.ok, true);
  assert.equal(р.delivery.state, 'DELIVERED');
  assert.deepEqual(р.delivery.history.map(h => h.state), ['QUEUED', 'SENT', 'ACKED', 'DELIVERED']);
});

test('слияние: чужой eventId отклоняется, пустая запись принимается как есть', () => {
  assert.equal(К.mergeDelivery({ eventId: 'a', state: 'SENT', history: [], attempts: 0 },
                               { eventId: 'b', state: 'DELIVERED', history: [], attempts: 0 }).reason, 'EVENT_MISMATCH');
  const р = К.mergeDelivery(null, { eventId: 'e', state: 'SENT', history: [], attempts: 0 });
  assert.equal(р.ok, true);
  assert.equal(р.delivery.state, 'SENT');
});

test('слияние: FAILED после DELIVERED игнорируется (факт доставки не откатывается)', () => {
  const делив = { eventId: 'e', state: 'DELIVERED', history: [{ state: 'DELIVERED', at: 2 }], attempts: 0 };
  const фейл = { eventId: 'e', state: 'FAILED', history: [{ state: 'FAILED', at: 3 }], attempts: 0 };
  const р = К.mergeDelivery(делив, фейл);
  assert.equal(р.ok, true);
  assert.equal(р.merged, false);
  assert.equal(р.delivery.state, 'DELIVERED');
  assert.equal(р.reason, 'STALE');
});

test('слияние: FAILED от SENT легален — применяется с сохранением попыток', () => {
  const сент = { eventId: 'e', state: 'SENT', history: [{ state: 'SENT', at: 1 }], attempts: 2 };
  const фейл = { eventId: 'e', state: 'FAILED', history: [{ state: 'FAILED', at: 3 }], attempts: 2 };
  const р = К.mergeDelivery(сент, фейл);
  assert.equal(р.ok, true);
  assert.equal(р.merged, true);
  assert.equal(р.delivery.state, 'FAILED');
  assert.equal(р.delivery.attempts, 2);
});
