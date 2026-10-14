/**
 * СИНГУЛЯР · ТЕСТ-СТРАЖ transport-adapter/0.1 — такт v11.31 «ГЕРМЕТИЧНО» (С109, PAT №33)
 * Контракт js/transport-adapter.js (шаг WP-07 карты ЗЕЛЁНОЙ): 0 сети, честные отказы, идемпотентность.
 * Запуск: node --test ИНСТРУМЕНТЫ/test_transport_adapter.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

const path = fileURLToPath(new URL('../js/transport-adapter.js', import.meta.url));
const Т = require(path);

test('канон экспортирован', () => {
  assert.equal(Т.канон, 'singulyar.transport/0.1');
});

test('fake-loopback зарегистрирован по умолчанию и честен в границах', () => {
  const а = Т.получить('fake-loopback');
  assert.ok(а, 'fake-loopback должен быть в реестре');
  assert.equal(а.режим, 'fake');
  assert.ok(а.границы.includes('Ничего не отправляет наружу'));
});

test('список() содержит fake-loopback и не мутируется извне', () => {
  const с = Т.список();
  assert.ok(с.includes('fake-loopback'));
  с.push('мусор');
  assert.ok(!Т.список().includes('мусор'), 'список() должен отдавать копию');
});

test('получить() на неизвестный id — null, не исключение', () => {
  assert.equal(Т.получить('нет-такого'), null);
  assert.equal(Т.получить(''), null);
});

test('дубликат id отклоняется', () => {
  assert.throws(() => Т.определитьАдаптер({
    id: 'fake-loopback', название: 'Дубль', режим: 'fake',
    возможности: ['text'], границы: 'тест', send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  }), /уже зарегистрирован/);
});

test('плохой id отклоняется честно', () => {
  for (const id of ['', 'A', 'с кириллицей', 'x'.repeat(65), null]) {
    assert.throws(() => Т.определитьАдаптер({
      id, название: 'Н', режим: 'fake', возможности: ['text'], границы: 'г',
      send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
    }), /id:/);
  }
});

test('режим network отклоняется (0 сети без явного слова, И-01)', () => {
  assert.throws(() => Т.определитьАдаптер({
    id: 'сеть', название: 'Сеть', режим: 'network',
    возможности: ['text'], границы: 'г', send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  }), /И-01/);
});

test('неизвестная возможность отклоняется', () => {
  assert.throws(() => Т.определитьАдаптер({
    id: 'странный', название: 'С', режим: 'fake',
    возможности: ['телепатия'], границы: 'г', send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  }), /неизвестна контракту/);
});

test('пустые возможности отклоняются', () => {
  assert.throws(() => Т.определитьАдаптер({
    id: 'пустой', название: 'П', режим: 'fake',
    возможности: [], границы: 'г', send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  }), /непустой массив/);
});

test('пустые границы отклоняются (честность обязательна)', () => {
  assert.throws(() => Т.определитьАдаптер({
    id: 'безграничный', название: 'Б', режим: 'fake',
    возможности: ['text'], границы: '  ', send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  }), /границы:/);
});

test('send без функции отклоняется', () => {
  assert.throws(() => Т.определитьАдаптер({
    id: 'без-send', название: 'Б', режим: 'fake',
    возможности: ['text'], границы: 'г', send: null
  }), /send:/);
});

test('fake-loopback send: текст проходит и попадает в append-only журнал', async () => {
  const ответ = await Т.получить('fake-loopback').send({ id: 'тест-1', kind: 'text', payload: { text: 'привет' } });
  assert.equal(ответ.состояние, 'accepted_by_transport');
  assert.equal(ответ.адаптер, 'fake-loopback');
  const ж = Т.журнал();
  assert.ok(ж.length >= 1);
  assert.equal(ж[ж.length - 1].id, 'тест-1');
  assert.equal(ж[ж.length - 1].состояние, 'accepted_by_transport');
});

test('send не-объекта — честный refused с причиной', async () => {
  for (const мусор of [null, 'строка', 42, []]) {
    const ответ = await Т.получить('fake-loopback').send(мусор);
    assert.equal(ответ.состояние, 'refused');
    assert.ok(ответ.причина.includes('ожидается объект'));
  }
});

test('send возможности вне списа адаптера — честный refused', async () => {
  const ответ = await Т.получить('fake-loopback').send({ id: 'тест-2', kind: 'голос-извне', payload: {} });
  assert.equal(ответ.состояние, 'refused');
  assert.ok(ответ.причина.includes('не ведёт'));
});

test('идемпотентность: повтор того же объекта — дубликат отмечен, состояние не скатывается', async () => {
  const а = Т.определитьАдаптер({
    id: 'тест-идемпотент', название: 'Идемпотент', режим: 'fake',
    возможности: ['text'], границы: 'тестовый, ничего не делает',
    send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  });
  const первый = await а.send({ id: 'идем-1', kind: 'text', payload: {} });
  const второй = await а.send({ id: 'идем-1', kind: 'text', payload: {} });
  assert.equal(первый.состояние, 'accepted_by_transport');
  assert.equal(второй.состояние, 'accepted_by_transport');
  assert.equal(второй.дубликат, true, 'повтор должен быть помечен дубликатом');
  assert.equal(первый.дубликат, undefined);
});

test('адаптер, вернувший недопустимое состояние, отзывается контрактом в refused', async () => {
  const а = Т.определитьАдаптер({
    id: 'тест-врун', название: 'Врун', режим: 'fake',
    возможности: ['text'], границы: 'тестовый врун',
    send: () => Promise.resolve({ состояние: 'какой-то-выдуманный' })
  });
  const ответ = await а.send({ id: 'врун-1', kind: 'text', payload: {} });
  assert.equal(ответ.состояние, 'refused');
  assert.ok(ответ.причина.includes('недопустимое состояние'));
});

test('закрытый адаптер честно отказывает', async () => {
  const а = Т.определитьАдаптер({
    id: 'тест-закрыт', название: 'Закрыт', режим: 'fake',
    возможности: ['text'], границы: 'тестовый',
    send: () => Promise.resolve({ состояние: 'accepted_by_transport' })
  });
  а.закрыть();
  const ответ = await а.send({ id: 'закрыт-1', kind: 'text', payload: {} });
  assert.equal(ответ.состояние, 'refused');
  assert.ok(ответ.причина.includes('закрыт'));
});

test('журнал append-only: нет способов удаления, порядок сохраняется', async () => {
  const до = Т.журнал().length;
  assert.ok(typeof Т.очистить === 'undefined', 'у журнала не должно быть метода очистки');
  await Т.получить('fake-loopback').send({ id: 'append-1', kind: 'text', payload: {} });
  const ж = Т.журнал();
  assert.equal(ж.length, до + 1);
  assert.ok(ж[ж.length - 1].когда, 'запись датирована');
});
