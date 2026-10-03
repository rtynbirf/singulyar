#!/usr/bin/env node
/* Тест мостов КРИСТАЛЛА — проверяется РЕАЛЬНЫЙ отгруженный модуль
   БИБЛИОТЕКИ/кристалл/bridges.mjs (ESM-импорт, не копия) + инварианты
   ядра на мостовых событиях + соответствие schema semantic-event.schema.json.
   Запуск: node --test ИНСТРУМЕНТЫ/test_crystal_bridges.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Б from '../БИБЛИОТЕКИ/кристалл/bridges.mjs';
import * as К from '../БИБЛИОТЕКИ/кристалл/crystal-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const КОРЕНЬ = path.join(__dirname, '..');

/* ── шов: фальшивый журнал с контрактом journal.mjs ── */
function фальшЖурнал() {
  const события = new Map(), ключи = new Set(), доставки = new Map();
  return {
    вызовы: { claimKey: 0, append: 0, applyDelivery: 0 },
    async claimKey(k) { this.вызовы.claimKey++; if (ключи.has(k)) return false; ключи.add(k); return true; },
    async hasKey(k) { return ключи.has(k); },
    async append(e) { this.вызовы.append++; события.set(e.id, e); return true; },
    async applyDelivery(з) { доставки.set(з.eventId, з); return { ok: true, merged: true, delivery: з }; },
    async all() { return [...события.values()]; },
    async count() { return события.size; },
    доставки
  };
}

function личность() {
  return { id: '11111111-2222-3333-4444-555555555555', имя: 'БАБУШКА',
           создана: 1767000000000, приватный: { СЕКРЕТ: true }, публичныйJWK: { kty: 'EC' } };
}

function манифестЗала() {
  return {
    ver: '1.0', kind: 'singular-event', room: 'P7J97',
    participants: [{ id: 'a1', name: 'ПАША', emoji: '🧑', listener: false },
                   { id: 'b2', name: 'АНЯ', emoji: '👩', listener: true }],
    song: { id: 'pP3Kk2_FHbE', title: 'Цени время' },
    startedAt: 1767000000000, endedAt: 1767000210000, durationMs: 210000,
    savePolicy: 'any', transport: 'local'
  };
}

/* ── 1. identity.ref ── */

test('identity.ref: событие без секретов — ключи остаются в ·19', () => {
  const { event } = Б.identityRefEvent(личность(), { подписана: false });
  const сырье = JSON.stringify(event);
  assert.ok(!сырье.includes('приватный'), 'приватный ключ утёк в событие');
  assert.ok(!сырье.includes('публичныйJWK'), 'публичныйJWK утёк в событие');
  assert.ok(!сырье.includes('privateKey') && !сырье.includes('kty'), 'материал ключей утёк');
  const в = event.semantic.attachments[0];
  assert.equal(в.kind, 'identity.ref');
  assert.equal(в.id, '11111111-2222-3333-4444-555555555555');
  assert.equal(в.имя, 'БАБУШКА');
  assert.equal(event.conversation, 'identity.ref');
  assert.equal(event.from, '·19');
  assert.equal(event.policy.retention, 'persistent');
});

test('identity.ref: idempotencyKey стабилен (перезагрузка не плодит факты)', () => {
  const л = личность();
  const а = Б.identityRefEvent(л).event;
  const б2 = Б.identityRefEvent(л, { подписана: true }).event;
  assert.equal(а.idempotencyKey, б2.idempotencyKey);
  assert.equal(а.idempotencyKey, 'identity-ref:' + л.id);
});

/* ── 2. shared.activity: сессия ── */

test('hall.session: зеркало манифеста, temporary с TTL, аудио нет', () => {
  const { event, вложение } = Б.activitySessionEvent(манифестЗала(), { сессияId: 'sess-1', ttlMs: 604800000 });
  assert.equal(event.conversation, 'shared.activity');
  assert.equal(event.from, '·18');
  assert.equal(вложение.kind, 'hall.session');
  assert.equal(вложение.room, 'P7J97');
  assert.equal(вложение.participants.length, 2);
  assert.equal(вложение.song.title, 'Цени время');
  assert.equal(вложение.durationMs, 210000);
  assert.equal(event.policy.retention, 'temporary');
  assert.equal(event.policy.ttl, 604800000);
  const сырье = JSON.stringify(event);
  assert.ok(!сырье.includes('audio') && !сырье.includes('blob'), 'аудио в событии не место');
  assert.equal(event.idempotencyKey, 'hall-session:sess-1');
  assert.ok(event.semantic.text.includes('P7J97') && event.semantic.text.includes('Цени время'),
    'текст должен быть человекочитаемым');
});

test('hall.session: без манифеста не падает, а честно пустеет', () => {
  const { event } = Б.activitySessionEvent(null, { сессияId: 'x' });
  assert.equal(event.semantic.attachments[0].room, '');
  assert.equal(event.policy.retention, 'temporary');
});

/* ── 3. shared.activity: память ❤️ ── */

test('hall.memory: persistent и ссылается на сессию через replyTo', () => {
  const з = { id: 'rec-1', manifest: манифестЗала(), savedAt: 1767000300000, photo: null, note: 'как здорово' };
  const { event } = Б.activityMemoryEvent(з, { сессияId: 'rec-1', sessionEventId: 'sess_abc' });
  assert.equal(event.policy.retention, 'persistent');
  assert.equal(event.policy.ttl, null);
  assert.equal(event.semantic.replyTo, 'sess_abc');
  assert.equal(event.idempotencyKey, 'hall-memory:rec-1');
  assert.equal(event.semantic.attachments[0].kind, 'hall.memory');
  assert.equal(event.semantic.attachments[0].заметка, 'как здорово');
});

test('hall.memory: без сессии replyTo=null — честная развязка, не выдумка', () => {
  const з = { id: 'rec-2', manifest: манифестЗала(), savedAt: Date.now() };
  const { event } = Б.activityMemoryEvent(з, { сессияId: 'rec-2', sessionEventId: null });
  assert.equal(event.semantic.replyTo, null);
});

/* ── 4. Схема: все три события содержат required-поля и типы ── */

test('все мостовые события — schema-легальные semantic.message', () => {
  const схема = JSON.parse(fs.readFileSync(path.join(КОРЕНЬ, 'БИБЛИОТЕКИ/кристалл/semantic-event.schema.json'), 'utf-8'));
  const события = [
    Б.identityRefEvent(личность()).event,
    Б.activitySessionEvent(манифестЗала(), { сессияId: 's' }).event,
    Б.activityMemoryEvent({ id: 'r', manifest: манифестЗала(), savedAt: 1 }).event
  ];
  for (const м of события) {
    for (const поле of схема.required) assert.ok(поле in м, 'нет required-поля ' + поле);
    assert.equal(м.type, схема.properties.type.const, 'type зафиксирован схемой');
    assert.ok(м.id.length >= 8);
    assert.ok(м.idempotencyKey.length >= 8);
    assert.ok(Number.isInteger(м.createdAt) && м.createdAt >= 0);
    assert.ok(typeof м.semantic.text === 'string');
    assert.ok(Array.isArray(м.semantic.attachments));
    assert.ok(['persistent', 'temporary'].includes(м.policy.retention));
    assert.ok(м.revision >= 1);
  }
});

/* ── 5. Инварианты ядра на мостовых событиях ── */

test('инвариант: смысл мостового события не меняется при представлении', () => {
  const { event } = Б.activitySessionEvent(манифестЗала(), { сессияId: 's' });
  const р = К.represent(event, { mode: 'captions' });
  assert.equal(р.text, event.semantic.text);
});

test('инвариант: сессия умирает по TTL, память живёт (retentionFilter)', () => {
  const с = Б.activitySessionEvent(манифестЗала(), { сессияId: 's', ttlMs: 100 }).event;
  const п = Б.activityMemoryEvent({ id: 'r', manifest: манифестЗала(), savedAt: 1 }, { сессияId: 'r' }).event;
  с.createdAt = п.createdAt = 1000;
  assert.equal(К.retentionFilter([с, п], 1200).length, 1);
  assert.equal(К.retentionFilter([с, п], 1200)[0].idempotencyKey, 'hall-memory:r');
});

test('инвариант: повторная публикация отбрасывается (applyIdempotent)', () => {
  const { event } = Б.identityRefEvent(личность());
  const seen = new Set();
  assert.equal(К.applyIdempotent(seen, event).accepted, true);
  assert.equal(К.applyIdempotent(seen, event).reason, 'DUPLICATE');
});

/* ── 6. Фабрика моста: публикация с фальшивым журналом ── */

test('makeBridge: публикация — claimKey → append → доставка QUEUED', async () => {
  const ж = фальшЖурнал();
  const мост = Б.makeBridge({ источник: 'тест', журнал: ж });
  await мост.готовь;
  assert.equal(мост.готов, true);
  const { event } = Б.identityRefEvent(личность());
  const р = await мост.опубликуй(event);
  assert.equal(р.reason, 'PUBLISHED');
  assert.equal(ж.вызовы.append, 1);
  assert.equal(ж.доставки.get(event.id).state, 'QUEUED');
  const все = await мост.события('identity.ref');
  assert.equal(все.length, 1);
  assert.equal(все[0].semantic.attachments[0].имя, 'БАБУШКА');
});

test('makeBridge: повторная публикация того же факта — DUPLICATE, append не зовётся', async () => {
  const ж = фальшЖурнал();
  const мост = Б.makeBridge({ журнал: ж });
  await мост.готовь;
  const { event } = Б.activitySessionEvent(манифестЗала(), { сессияId: 's' });
  assert.equal((await мост.опубликуй(event)).reason, 'PUBLISHED');
  const р2 = await мост.опубликуй(event);
  assert.equal(р2.reason, 'DUPLICATE');
  assert.equal(ж.вызовы.append, 1, 'дедуп должен случиться ДО append');
});

test('makeBridge: журнал умер — честный JOURNAL_UNAVAILABLE, не DUPLICATE', async () => {
  const мёртв = { async claimKey() { return false; }, async hasKey() { return false; },
                   async append() { return false; }, async applyDelivery() { return null; },
                   async all() { return []; }, async count() { return 0; } };
  const мост = Б.makeBridge({ журнал: мёртв });
  await мост.готовь;
  const { event } = Б.identityRefEvent(личность());
  const р = await мост.опубликуй(event);
  assert.equal(р.ok, false);
  assert.equal(р.reason, 'JOURNAL_UNAVAILABLE');
});

test('makeBridge: события() без журнала — пусто, без исключений', async () => {
  const мост = Б.makeBridge({ источник: 'тест-без-журнала' });
  assert.equal(мост.готов, false);
  const все = await мост.события();
  assert.deepEqual(все, []);
  const р = await мост.опубликуй({ idempotencyKey: 'k' });
  assert.equal(р.reason, 'JOURNAL_UNAVAILABLE');
});

/* ── 7. Версия и карта мостов ── */

test('мосты — ненормативный слой: своя версия, РАЗГОВОРЫ зафиксированы', () => {
  assert.equal(Б.BRIDGES.name, 'singulyar-crystal-bridges');
  assert.equal(Б.BRIDGES.version, '1.3.0');
  assert.equal(Б.РАЗГОВОРЫ.identity, 'identity.ref');
  assert.equal(Б.РАЗГОВОРЫ.activity, 'shared.activity');
  assert.equal(Б.РАЗГОВОРЫ.call, 'call.signal');
  /* ядро при этом не тронуто — его версия остаётся нормативной */
  assert.equal(К.CRYSTAL.version, '1.0.0');
});

/* ── 8. memory.decide — решение о памяти (синтез Human Runtime, TTL ≠ MEMORY) ── */

test('memory.decide: remember — отдельное неизменяемое семантическое событие', () => {
  const { event, вложение } = Б.memoryDecisionEvent('remember', {
    цельId: 'mem_A1', цельСобытиеId: 'mem_event_1', комната: 'P7J97', актId: 'акт-1' });
  assert.equal(вложение.kind, 'hall.memory.decide');
  assert.equal(вложение.решение, 'remember');
  assert.equal(вложение.цель, 'mem_A1');
  assert.equal(event.type, 'semantic.message');
  assert.equal(event.conversation, 'shared.activity');
  assert.equal(event.from, '·18');
  assert.equal(event.policy.retention, 'persistent');
  assert.equal(event.semantic.replyTo, 'mem_event_1');
  assert.ok(event.id.length >= 8, 'id schema-легален');
  assert.ok(event.semantic.text.includes('хранить'));
});

test('memory.decide: expire — забвение по решению человека', () => {
  const { event, вложение } = Б.memoryDecisionEvent('expire', {
    цельId: 'mem_A1', комната: 'P7J97', актId: 'акт-2' });
  assert.equal(вложение.решение, 'expire');
  assert.equal(event.idempotencyKey, 'hall-decide:mem_A1:expire:акт-2');
  assert.ok(event.semantic.text.includes('забыть'));
  assert.equal(event.semantic.replyTo, null, 'цельСобытиеId не задан — честный null');
});

test('memory.decide: дедуп бережёт АКТ, не свободу передумать', () => {
  const а = Б.memoryDecisionEvent('remember', { цельId: 'm1', актId: 'акт-9' });
  const б = Б.memoryDecisionEvent('remember', { цельId: 'm1', актId: 'акт-9' });
  const в = Б.memoryDecisionEvent('expire', { цельId: 'm1', актId: 'акт-10' });
  assert.equal(а.event.idempotencyKey, б.event.idempotencyKey, 'тот же акт — тот же ключ (дедуп)');
  assert.equal(а.event.id, б.event.id);
  assert.notEqual(а.event.idempotencyKey, в.event.idempotencyKey, 'передумал — новое событие');
  assert.notEqual(а.event.id, в.event.id);
});

test('memory.decide: мусорное решение — честный throw', () => {
  assert.throws(() => Б.memoryDecisionEvent('незнаю'), /remember/);
  assert.throws(() => Б.memoryDecisionEvent(''), /remember/);
});

test('memory.decide: публикация через мост — PUBLISHED и дедуп работают', async () => {
  const ж = фальшЖурнал();
  const мост = Б.makeBridge({ источник: 'тест-decide', журнал: ж });
  await мост.готовь;
  const { event } = Б.memoryDecisionEvent('remember', { цельId: 'mem_B2', комната: 'ZZ11', актId: 'акт-3' });
  const р1 = await мост.опубликуй(event);
  assert.ok(р1.ok && р1.reason === 'PUBLISHED', 'первый акт публикуется');
  const р2 = await мост.опубликуй(event);
  assert.ok(!р2.ok && р2.reason === 'DUPLICATE', 'повтор того же акта = дедуп');
  const все = await мост.события('shared.activity');
  assert.equal(все.length, 1);
  assert.equal(все[0].semantic.attachments[0].kind, 'hall.memory.decide');
});

test('memory.decide: schema-легальность нового события', () => {
  const схема = JSON.parse(fs.readFileSync(path.join(КОРЕНЬ, 'БИБЛИОТЕКИ/кристалл/semantic-event.schema.json'), 'utf-8'));
  const м = Б.memoryDecisionEvent('expire', { цельId: 'mem_C3', цельСобытиеId: 'e9', актId: 'акт-4' }).event;
  for (const поле of схема.required) assert.ok(поле in м, 'нет required-поля ' + поле);
  assert.equal(м.type, схема.properties.type.const);
  assert.ok(м.id.length >= 8 && м.idempotencyKey.length >= 8);
  assert.ok(Number.isInteger(м.createdAt) && м.createdAt >= 0);
  assert.ok(['persistent', 'temporary'].includes(м.policy.retention));
  /* ядро при этом не тронуто */
  assert.equal(К.CRYSTAL.version, '1.0.0');
});

/* ═════════ v1.2.0: верификация личности (hall.join) и ротация (hall.epoch) ═════════ */

test('hall.join: форма события — публичный JWK + подпись, без секретов', () => {
  const jwk = { kty: 'EC', crv: 'P-256', x: 'X', y: 'Y' };
  const { event, вложение } = Б.hallJoinEvent(
    { id: 'ид-77', имя: 'ПАША', публичныйJWK: jwk },
    { room: 'P7J97', эпоха: 2, подпись: 'ПОДПИСЬ' });
  assert.equal(вложение.kind, 'hall.join');
  assert.equal(вложение.room, 'P7J97');
  assert.equal(вложение.эпоха, 2);
  assert.deepEqual(вложение.участник, { id: 'ид-77', имя: 'ПАША' });
  assert.equal(вложение.публичныйJWK, jwk, 'наружу только публичный JWK');
  assert.equal(вложение.подписана, true);
  assert.equal(event.from, '·19');
  assert.equal(event.conversation, 'shared.activity');
  assert.equal(event.idempotencyKey, 'hall-join:P7J97:ид-77:2');
  assert.ok(event.semantic.text.includes('сошлась'), 'честный текст при подписи');
  assert.ok(event.id.length >= 8);
  assert.equal(event.policy.retention, 'persistent');
  /* приватных ключей в событии нет и быть не должно:
     JWK не несёт приватную компоненту d, слов privateKey/d в полях нет */
  assert.equal(вложение.публичныйJWK.d, undefined, 'в JWK нет приватной компоненты d');
  const сыр = JSON.stringify(event);
  assert.ok(!сыр.includes('privateKey'), 'не утекает privateKey');
});

test('hall.join: без подписи — честный «без подписи», ключ идемпотентности стабилен', () => {
  const а = Б.hallJoinEvent({ id: 'ид-1', имя: 'Гость' }, { room: 'ZZ11', эпоха: 1 });
  const б = Б.hallJoinEvent({ id: 'ид-1', имя: 'Гость' }, { room: 'ZZ11', эпоха: 1 });
  assert.equal(а.вложение.подписана, false);
  assert.ok(а.event.semantic.text.includes('без подписи'));
  assert.equal(а.event.idempotencyKey, б.event.idempotencyKey, 'повторный вход в ту же эпоху = дедуп');
  const в = Б.hallJoinEvent({ id: 'ид-1', имя: 'Гость' }, { room: 'ZZ11', эпоха: 2 });
  assert.notEqual(а.event.idempotencyKey, в.event.idempotencyKey, 'новая эпоха = честно новое событие');
});

test('hall.epoch: открытое событие — метаданные не секрет, одна эпоха = одно объявление', () => {
  const а = Б.hallEpochEvent({ room: 'P7J97', эпоха: 3, причина: 'смена фразы (rekey)', инициатор: { id: 'ид-1', имя: 'ПАША' }, подпись: 'S' });
  assert.equal(а.вложение.kind, 'hall.epoch');
  assert.equal(а.вложение.эпоха, 3);
  assert.equal(а.вложение.подписана, true);
  assert.equal(а.event.from, '·22');
  assert.equal(а.event.idempotencyKey, 'hall-epoch:P7J97:3');
  const б = Б.hallEpochEvent({ room: 'P7J97', эпоха: 3, причина: 'повтор' });
  assert.equal(а.event.idempotencyKey, б.event.idempotencyKey, 'переобъявление эпохи = дедуп');
  const в = Б.hallEpochEvent({ room: 'P7J97', эпоха: 4, причина: 'ротация' });
  assert.notEqual(а.event.idempotencyKey, в.event.idempotencyKey);
  assert.ok(а.event.semantic.text.includes('эпоха 3'));
  assert.ok(в.вложение.подписана === false, 'без подписи — честно');
});

test('hall.join/epoch: публикация через мост и schema-легальность', async () => {
  const ж = фальшЖурнал();
  const мост = Б.makeBridge({ источник: 'тест-v2', журнал: ж });
  await мост.готовь;
  const j = Б.hallJoinEvent({ id: 'ид-9', имя: 'Гость', публичныйJWK: { kty: 'EC' } }, { room: 'ZZ11', эпоха: 1, подпись: 'S1' });
  const рj = await мост.опубликуй(j.event);
  assert.ok(рj.ok && рj.reason === 'PUBLISHED');
  const рj2 = await мост.опубликуй(j.event);
  assert.ok(!рj2.ok && рj2.reason === 'DUPLICATE', 'дедуп работает и здесь');
  const э = Б.hallEpochEvent({ room: 'ZZ11', эпоха: 2, причина: 'ротация' });
  const рэ = await мост.опубликуй(э.event);
  assert.ok(рэ.ok);
  const все = await мост.события('shared.activity');
  assert.equal(все.length, 2);
  const схема = JSON.parse(fs.readFileSync(path.join(КОРЕНЬ, 'БИБЛИОТЕКИ/кристалл/semantic-event.schema.json'), 'utf-8'));
  for (const событие of все) {
    for (const поле of схема.required) assert.ok(поле in событие, 'нет required-поля ' + поле);
    assert.equal(событие.type, схема.properties.type.const);
    assert.ok(событие.id.length >= 8);
  }
  /* ядро по-прежнему не тронуто */
  assert.equal(К.CRYSTAL.version, '1.0.0');
});

/* ═════════ v1.3.0: call.signal — звонок как факт ═════════ */

test('call.signal: ring — факт звонка, temporary с TTL звонка, подпись честна', () => {
  const { event, вложение } = Б.callSignalEvent({
    room: 'P7J97', звонкаId: 'з123-abc', действие: 'ring', канал: 'audio',
    от: { id: 'ид-77', имя: 'ПАША' }, кому: { id: 'ид-9', имя: 'Гость' }, эпоха: 2, подпись: 'ПОДПИСЬ' });
  assert.equal(вложение.kind, 'call.signal');
  assert.equal(вложение.действие, 'ring');
  assert.equal(вложение.канал, 'audio');
  assert.equal(вложение.подписана, true);
  assert.equal(event.from, '·22');
  assert.equal(event.conversation, 'call.signal');
  assert.equal(event.policy.retention, 'temporary');
  assert.equal(event.policy.ttl, 600000);
  assert.equal(event.idempotencyKey, 'call-signal:P7J97:з123-abc:ring:ид-77');
  assert.ok(event.semantic.text.includes('звонит'), 'текст человекочитаем');
  assert.ok(event.semantic.text.includes('подпись ·19 сошлась'));
  assert.ok(event.id.length >= 8);
  const сыр = JSON.stringify(event);
  assert.ok(!сыр.includes('privateKey'), 'не утекает privateKey');
});

test('call.signal: каждый акт — отдельное событие; дедуп бережёт АКТ, не ход звонка', () => {
  const а = Б.callSignalEvent({ room: 'Z', звонкаId: 'к1', действие: 'ring', от: { id: 'и1', имя: 'А' } });
  const б = Б.callSignalEvent({ room: 'Z', звонкаId: 'к1', действие: 'accept', от: { id: 'и2', имя: 'Б' } });
  const в = Б.callSignalEvent({ room: 'Z', звонкаId: 'к1', действие: 'end', от: { id: 'и1', имя: 'А' } });
  assert.notEqual(а.event.idempotencyKey, б.event.idempotencyKey);
  assert.notEqual(а.event.idempotencyKey, в.event.idempotencyKey);
  const а2 = Б.callSignalEvent({ room: 'Z', звонкаId: 'к1', действие: 'ring', от: { id: 'и1', имя: 'А' } });
  assert.equal(а.event.idempotencyKey, а2.event.idempotencyKey, 'повтор того же акта = тот же ключ (дедуп)');
  assert.equal(а.event.id, а2.event.id);
});

test('call.signal: канал нормализуется, мусорное действие — честный throw', () => {
  assert.equal(Б.callSignalEvent({ звонкаId: 'к', действие: 'ring', канал: 'video' }).вложение.канал, 'video');
  assert.equal(Б.callSignalEvent({ звонкаId: 'к', действие: 'ring', канал: 'чушь' }).вложение.канал, 'audio');
  assert.throws(() => Б.callSignalEvent({ звонкаId: 'к', действие: 'чушь' }), /ring/);
  assert.throws(() => Б.callSignalEvent({ звонкаId: 'к', действие: '' }), /ring/);
});

test('call.signal: без подписи — честный текст; причина попадает в событие', () => {
  const п = Б.callSignalEvent({ room: 'Z', звонкаId: 'к2', действие: 'decline', от: { id: 'и1', имя: 'А' }, причина: 'занят' });
  assert.equal(п.вложение.подписана, false);
  assert.ok(п.event.semantic.text.includes('занят'));
  assert.ok(!п.event.semantic.text.includes('сошлась'));
});

test('call.signal: публикация через мост и schema-легальность', async () => {
  const ж = фальшЖурнал();
  const мост = Б.makeBridge({ источник: 'тест-звонок', журнал: ж });
  await мост.готовь;
  const р = Б.callSignalEvent({ room: 'Z', звонкаId: 'к3', действие: 'ring', от: { id: 'и1', имя: 'А' } });
  const р1 = await мост.опубликуй(р.event);
  assert.ok(р1.ok && р1.reason === 'PUBLISHED');
  const р2 = await мост.опубликуй(р.event);
  assert.ok(!р2.ok && р2.reason === 'DUPLICATE', 'дедуп по акту работает');
  const все = await мост.события('call.signal');
  assert.equal(все.length, 1);
  const схема = JSON.parse(fs.readFileSync(path.join(КОРЕНЬ, 'БИБЛИОТЕКИ/кристалл/semantic-event.schema.json'), 'utf-8'));
  for (const событие of все) {
    for (const поле of схема.required) assert.ok(поле in событие, 'нет required-поля ' + поле);
    assert.equal(событие.type, схема.properties.type.const);
    assert.ok(событие.id.length >= 8);
  }
  /* ядро по-прежнему не тронуто */
  assert.equal(К.CRYSTAL.version, '1.0.0');
});
