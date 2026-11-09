/**
 * Тесты детектора хлопков (Г3, Фаза 2–3) — чистая DSP-логика на синтетике.
 * Рядом с sim-clock: шум детерминированный (mulberry32) — тесты повторяемы.
 *
 * Сцены: три хлопка известного времени в шуме 48 кГц (все найдены ±10 мс,
 * двойной 250 мс распознан), рефрактерность 180 мс, границы двойного,
 * шум/удержанный тон/тишина без хлопков — ноль срабатываний, контракт
 * событий {t, энергия, индекс, тип}, reset() сбрасывает состояние, поток
 * через несколько feed(), честный фолбэк без AudioWorklet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectClaps, ClapTracker, createClapDetector, CLAP_PARAMS } from '../src/clap-detector.mjs';
import { mulberry32 } from './sim-clock.mjs';

const SR = 48000;

/** Детерминированный шум: uniform [-amp, +amp]. */
function makeNoise(len, amp, rng) {
  const b = new Float32Array(len);
  for (let i = 0; i < len; i++) b[i] = (rng() * 2 - 1) * amp;
  return b;
}

/** Добавить хлопок: всплеск широкополосного шума с экспоненциальным спадом. */
function addClap(buf, tSec, { amp = 0.8, durMs = 40, tauMs = 12, rng } = {}) {
  const start = Math.round(tSec * SR);
  const dur = Math.round((SR * durMs) / 1000);
  const tau = (SR * tauMs) / 1000;
  for (let i = 0; i < dur && start + i < buf.length; i++) {
    buf[start + i] += (rng() * 2 - 1) * amp * Math.exp(-i / tau);
  }
  return start;
}

/** Хлопки (сек) → буфер длиной lenSec с фоном amp. */
function scene(lenSec, claps, { amp = 0.03, seed = 101 } = {}) {
  const rng = mulberry32(seed);
  const buf = makeNoise(Math.round(lenSec * SR), amp, rng);
  for (const t of claps) addClap(buf, t, { rng });
  return buf;
}

const clapsOf = (events) => events.filter((e) => e.тип === 'хлопок');
const doublesOf = (events) => events.filter((e) => e.тип === 'двойной');

test('три хлопка в шуме 48 кГц найдены, время каждого ±10 мс', () => {
  const truth = [1.0, 1.25, 3.0];
  const events = clapsOf(detectClaps(scene(4, truth), SR));
  assert.equal(events.length, 3, 'найдены все три, лишних нет');
  truth.forEach((t, i) => {
    assert.ok(Math.abs(events[i].t - t) <= 0.010,
      `хлопок ${i}: найден ${events[i].t.toFixed(4)} с, ожидался ${t} с (±10 мс)`);
  });
});

test('двойной хлопок (250 мс) распознан отдельным событием', () => {
  const events = detectClaps(scene(4, [1.0, 1.25, 3.0]), SR);
  const doubles = doublesOf(events);
  assert.equal(doubles.length, 1, 'ровно одно событие «двойной»');
  assert.ok(Math.abs(doubles[0].t - 1.0) <= 0.010, 't двойного = первый хлопок пары');
  assert.ok(Math.abs(doubles[0].t2 - 1.25) <= 0.010, 't2 двойного = второй хлопок пары');
  assert.ok(Math.abs(doubles[0].интервалМс - 250) <= 10, 'интервал пары ≈ 250 мс');
});

test('интервал 700 мс — за границей двойного: два хлопка, ноль «двойных»', () => {
  const events = detectClaps(scene(4, [1.0, 1.7]), SR);
  assert.equal(clapsOf(events).length, 2);
  assert.equal(doublesOf(events).length, 0);
});

test('рефрактерность: хлопки ближе 180 мс сливаются в один', () => {
  const events = detectClaps(scene(4, [1.0, 1.1]), SR);
  const claps = clapsOf(events);
  assert.equal(claps.length, 1, `второй хлопок через 100 мс проглочен (найдено ${claps.length})`);
  assert.ok(Math.abs(claps[0].t - 1.0) <= 0.010);
  assert.equal(doublesOf(events).length, 0, '100 мс < 180 мс — не двойной');
});

test('шум без хлопков — ноль срабатываний', () => {
  const events = detectClaps(scene(3, []), SR);
  assert.equal(events.length, 0);
});

test('постоянный шум и удержанный тон не ловятся (нет резкого роста со спадом)', () => {
  // (а) ровный громкий шум с первой секунды
  const rngA = mulberry32(7);
  assert.equal(detectClaps(makeNoise(2 * SR, 0.2, rngA), SR).length, 0, 'ровный шум');
  // (б) тихий фон → постоянный тон 1 с → снова фон
  const rngB = mulberry32(11);
  const buf = makeNoise(2 * SR, 0.03, rngB);
  for (let i = Math.round(0.5 * SR); i < Math.round(1.5 * SR); i++) {
    buf[i] += 0.3 * Math.sin((2 * Math.PI * 440 * i) / SR);
  }
  assert.equal(detectClaps(buf, SR).length, 0, 'удержанный тон — не хлопок');
});

test('полная тишина (нули) — ноль срабатываний', () => {
  assert.equal(detectClaps(new Float32Array(SR), SR).length, 0);
});

test('контракт события: {t, энергия, индекс, тип}, аргументы проверяются честно', () => {
  const events = detectClaps(scene(2, [1.0]), SR);
  assert.ok(events.length >= 1);
  const ev = clapsOf(events)[0];
  assert.equal(ev.тип, 'хлопок');
  assert.equal(typeof ev.t, 'number');
  assert.ok(ev.t >= 0);
  assert.ok(Number.isFinite(ev.энергия) && ev.энергия > 0, 'энергия — конечный положительный пик');
  assert.ok(Number.isInteger(ev.индекс) && ev.индекс >= 0, 'индекс — целый сэмпл');
  assert.throws(() => detectClaps(scene(1, []), NaN), TypeError, 'sampleRate проверяется');
  assert.throws(() => new ClapTracker({}), TypeError, 'без sampleRate трекер не строится');
  assert.throws(() => new ClapTracker({ sampleRate: SR }).feed(null), TypeError, 'буфер проверяется');
});

test('reset() честно сбрасывает: счётчик с нуля, рефрактерность не переживает', () => {
  const tr = new ClapTracker({ sampleRate: SR });
  const buf1 = scene(2, [0.5]);
  assert.equal(clapsOf(tr.feed(buf1)).length, 1);
  assert.ok(tr.samplesFed === buf1.length);
  tr.reset();
  assert.equal(tr.samplesFed, 0, 'счётчик обнулён');
  const buf2 = scene(2, [0.5]);
  const ev2 = clapsOf(tr.feed(buf2));
  assert.equal(ev2.length, 1, 'детектор снова ловит хлопок как с нуля');
  assert.ok(Math.abs(ev2[0].t - 0.5) <= 0.010, 'время не уехало: счётчик не протёк через reset');
});

test('поток: хлопок, разрезанный между двумя feed(), находится ровно один раз', () => {
  const tr = new ClapTracker({ sampleRate: SR });
  const buf = scene(2, [1.0]);
  const cut = Math.round(1.005 * SR); // середина вспышки
  const ev1 = tr.feed(buf.subarray(0, cut));
  const ev2 = tr.feed(buf.subarray(cut));
  assert.equal(clapsOf(ev1).length + clapsOf(ev2).length, 1, 'хлопок один, без дубля');
});

test('поток с абсолютными индексами: sampleOffset задаёт честные времена', () => {
  const tr = new ClapTracker({ sampleRate: SR });
  const buf = scene(1, [0.5]);
  const off = 10 * SR; // «запись» началась на 10-й секунде потока
  const ev = clapsOf(tr.feed(buf, { sampleOffset: off }));
  assert.equal(ev.length, 1);
  assert.ok(Math.abs(ev[0].t - 10.5) <= 0.010, `t = 10,5 с по абсолютному индексу (сейчас ${ev[0].t.toFixed(3)})`);
});

test('честный фолбэк: без AudioWorklet — ok:false, причина, имитации нет', async () => {
  const got = [];
  const d = await createClapDetector({ audioContext: {}, onClap: (e) => got.push(e) });
  if (typeof AudioWorkletNode === 'undefined') {
    // node: API нет — обязан быть честный отказ
    assert.equal(d.ok, false);
    assert.equal(d.node, null);
    assert.equal(typeof d.причина, 'string');
    assert.ok(d.причина.length > 0, 'причина отказа объяснена словами');
    await d.start();
    d.stop();
    assert.equal(got.length, 0, 'no-op обвязка не порождает событий — имитации нет');
  } else {
    // среда с AudioWorklet: контракт не ломается
    assert.ok(d.ok === true || (d.ok === false && typeof d.причина === 'string'));
  }
});

test('параметры алгоритма доступны и совпадают с задачей Г3', () => {
  assert.equal(CLAP_PARAMS.DECAY_MAX_MS, 120, 'спад короче 120 мс');
  assert.equal(CLAP_PARAMS.MIN_INTERVAL_MS, 180, 'минимальный интервал 180 мс');
  assert.equal(CLAP_PARAMS.DOUBLE_MIN_MS, 180);
  assert.equal(CLAP_PARAMS.DOUBLE_MAX_MS, 600, 'двойной: 180–600 мс');
});
