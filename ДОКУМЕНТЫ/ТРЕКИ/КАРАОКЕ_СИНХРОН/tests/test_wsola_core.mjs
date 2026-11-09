/* ═══════════════════════════════════════════════════════════════════
   Пробы канона wsola-core/0.1 (node --test) — такт v11.31 «ТЕМП», ПВ3.
   Синтетика: чистые тоны/тишина — правда о высоте и длине без сети.
   Приёмка ПВ3: тайм-стретч без смещения высоты, вход не мутируется,
   детерминизм, честные русские отказы, порт ≡ канон (vm, байт в байт),
   бенчмарк мс/сек аудио — в самом низу, честное измерение.
   ═══════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ИМЯ, смещения, растянуть, растянутьСтерео, инфо } from '../src/wsola-core.mjs';

const СР = 44100;
const СЕК = 2;

function тон(гц, сек = СЕК, ср = СР, амплитуда = 0.4, фаза = 0) {
  const n = Math.round(сек * ср);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = амплитуда * Math.sin(2 * Math.PI * гц * (i / ср) + фаза);
  return x;
}

function копия(x) { return new Float32Array(x); }

function одинаковые(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/* частота по переходам через ноль (честный замер синтетики) */
function частотаПоНулям(x, ср = СР) {
  let пересечений = 0;
  for (let i = 1; i < x.length; i++) {
    if ((x[i - 1] < 0 && x[i] >= 0) || (x[i - 1] >= 0 && x[i] < 0)) пересечений++;
  }
  const сек = x.length / ср;
  return пересечений / 2 / сек;
}

test('имя канона', () => {
  assert.equal(ИМЯ, 'wsola-core/0.1');
});

test('коэффициент 1 — честная копия: та же длина, те же байты, другой объект', () => {
  const x = тон(440);
  const y = растянуть(x, { коэффициент: 1 });
  assert.notEqual(y, x, 'возвращается новый буфер, не тот же');
  assert.equal(y.length, x.length);
  assert.ok(одинаковые(x, y), 'байты идентичны');
});

test('растяжение ×2 — выход вдвое короче (±1 кадр)', () => {
  const x = тон(440);
  const y = растянуть(x, { коэффициент: 2 });
  const кадр = Math.round(0.030 * СР) + 2;
  assert.ok(Math.abs(y.length - x.length / 2) <= кадр, 'длина ' + y.length + ' ≈ ' + x.length / 2 + ' (±' + кадр + ')');
});

test('сжатие ×0.5 — выход вдвое длиннее (±краевые кадры)', () => {
  const x = тон(440);
  const y = растянуть(x, { коэффициент: 0.5 });
  /* честный допуск: формула длины outN = F·Ha + N даёт систематическую
     недостачу до (N + Δ)/коэффициент на краях — считаем её прямо */
  const N = 2 * Math.round(0.030 * СР / 2), Δ = Math.round(0.015 * СР);
  const доп = Math.ceil((N + Δ) / 0.5) + N + 8;
  assert.ok(Math.abs(y.length - x.length * 2) <= доп, 'длина ' + y.length + ' ≈ ' + x.length * 2 + ' (±' + доп + ')');
});

test('высота стоит ×2: 440 Гц → 440 ± 2% (по нулям)', () => {
  const y = растянуть(тон(440), { коэффициент: 2 });
  const f = частотаПоНулям(y);
  assert.ok(Math.abs(f - 440) < 8.8, 'факт ' + f.toFixed(1) + ' Гц');
});

test('высота стоит ×1.5: 440 Гц → 440 ± 2%', () => {
  const y = растянуть(тон(440), { коэффициент: 1.5 });
  const f = частотаПоНулям(y);
  assert.ok(Math.abs(f - 440) < 8.8, 'факт ' + f.toFixed(1) + ' Гц');
});

test('высота стоит ×0.5: 440 Гц → 440 ± 2%', () => {
  const y = растянуть(тон(440), { коэффициент: 0.5 });
  const f = частотаПоНулям(y);
  assert.ok(Math.abs(f - 440) < 8.8, 'факт ' + f.toFixed(1) + ' Гц');
});

test('высота стоит ×0.25: 440 Гц → 440 ± 2% (крайний растяг)', () => {
  const y = растянуть(тон(440, 1), { коэффициент: 0.25 });
  const f = частотаПоНулям(y);
  assert.ok(Math.abs(f - 440) < 8.8, 'факт ' + f.toFixed(1) + ' Гц');
});

test('вход не мутируется (моно)', () => {
  const x = тон(330);
  const до = копия(x);
  растянуть(x, { коэффициент: 1.5 });
  assert.ok(одинаковые(x, до), 'буфер байт в байт тот же');
});

test('вход не мутируется (стерео)', () => {
  const L = тон(330), R = тон(392);
  const доL = копия(L), доR = копия(R);
  растянутьСтерео([L, R], { коэффициент: 1.5 });
  assert.ok(одинаковые(L, доL) && одинаковые(R, доR), 'каналы не тронуты');
});

test('детерминизм: два прогона — байт в байт', () => {
  const x = тон(293.66, 1.7);
  const a = растянуть(x, { коэффициент: 1.5 });
  const b = растянуть(x, { коэффициент: 1.5 });
  assert.ok(одинаковые(a, b), 'тот же вход — тот же выход');
  const τ1 = смещения(x, 1.5), τ2 = смещения(x, 1.5);
  assert.deepEqual(Array.from(τ1), Array.from(τ2), 'смещения тоже детерминированы');
});

test('честный отказ: коэффициент 0 — RangeError по-русски', () => {
  assert.throws(() => растянуть(тон(440), { коэффициент: 0 }), (е) =>
    е instanceof RangeError && /вне честного диапазона/.test(е.message));
});

test('честный отказ: коэффициент 5 — RangeError', () => {
  assert.throws(() => растянуть(тон(440), { коэффициент: 5 }), RangeError);
});

test('честный отказ: коэффициент NaN — RangeError', () => {
  assert.throws(() => растянуть(тон(440), { коэффициент: NaN }), (е) =>
    /конечным числом/.test(е.message));
});

test('честный отказ: коэффициент Infinity — RangeError', () => {
  assert.throws(() => растянуть(тон(440), { коэффициент: Infinity }), RangeError);
});

test('честный отказ: вход не Float32Array — TypeError по-русски', () => {
  assert.throws(() => растянуть([1, 2, 3], { коэффициент: 1.5 }), (е) =>
    е instanceof TypeError && /Float32Array/.test(е.message));
});

test('честный отказ: пустой вход — RangeError', () => {
  assert.throws(() => растянуть(new Float32Array(0), { коэффициент: 1.5 }), (е) =>
    /вход пуст/.test(е.message));
});

test('честный отказ: вход короче кадра+поиска — RangeError', () => {
  assert.throws(() => растянуть(new Float32Array(500), { коэффициент: 1.5 }), (е) =>
    /короче кадра/.test(е.message));
});

test('честный отказ: частотаСэмплов 0 — RangeError', () => {
  assert.throws(() => растянуть(тон(440), { коэффициент: 1.5, частотаСэмплов: 0 }), RangeError);
});

test('честный отказ: стерео с разными длинами каналов — RangeError', () => {
  assert.throws(() => растянутьСтерео([тон(440, 2), тон(440, 1)], { коэффициент: 1.5 }), (е) =>
    /длины каналов не равны/.test(е.message));
});

test('тишина → честная тишина: без NaN, все нули', () => {
  const y = растянуть(new Float32Array(СР * 2), { коэффициент: 1.5 });
  assert.ok(y.length > 0);
  for (let i = 0; i < y.length; i++) {
    assert.ok(isFinite(y[i]), 'значение ' + i + ' конечно');
    assert.equal(y[i], 0, 'тишина не выдумывается');
  }
});

test('на сигнале нет NaN — все значения конечны', () => {
  const y = растянуть(тон(261.63, 3), { коэффициент: 0.75 });
  for (let i = 0; i < y.length; i++) assert.ok(isFinite(y[i]));
});

test('стерео в фазе: одинаковые каналы остаются одинаковыми (микс-поиск)', () => {
  const r = растянутьСтерео([тон(440, 1.5), тон(440, 1.5)], { коэффициент: 1.5 });
  const [L, R] = r.каналы;
  assert.equal(L.length, R.length);
  assert.ok(одинаковые(L, R), 'одинаковые каналы — одинаковый выход');
});

test('стерео ×2 — длина ≈ половине (±1 кадр)', () => {
  const r = растянутьСтерео([тон(440, 2), тон(330, 2)], { коэффициент: 2 });
  const кадр = Math.round(0.030 * СР) + 2;
  assert.ok(Math.abs(r.каналы[0].length - СР) <= кадр);
});

test('кастомные опоры: окноМс 20, поискМс 10 — длина корректна', () => {
  const x = тон(440, 2);
  const y = растянуть(x, { коэффициент: 1.5, окноМс: 20, поискМс: 10 });
  const кадр = Math.round(0.020 * СР) + 2;
  assert.ok(Math.abs(y.length - x.length / 1.5) <= кадр * 2, 'длина ' + y.length + ' ≈ ' + Math.round(x.length / 1.5));
});

test('смещения детерминированы и в границах поиска', () => {
  const x = тон(196, 2);
  const τ = смещения(x, 1.25, { поискМс: 10 });
  const Δ = Math.round(0.010 * СР);
  for (let k = 1; k < τ.length; k++) {
    assert.ok(Math.abs(τ[k]) <= Δ, 'сдвиг ' + τ[k] + ' в ±' + Δ);
  }
});

test('инфо() честная: границы и хвост названы', () => {
  const и = инфо();
  assert.equal(и.имя, 'wsola-core/0.1');
  assert.ok(и.не_умеет.some((s) => /AudioWorklet/.test(s)), 'потоковость — честный хвост');
  assert.ok(и.не_умеет.some((s) => /WASM/.test(s)), 'WASM — честный хвост');
  assert.ok(/0 сети/.test(и.честность));
});

test('0 сети и 0 случайности в исходнике канона', () => {
  const src = fs.readFileSync(new URL('../src/wsola-core.mjs', import.meta.url), 'utf8');
  assert.ok(!/fetch\s*\(/.test(src), 'нет fetch');
  assert.ok(!/XMLHttpRequest/.test(src), 'нет XMLHttpRequest');
  assert.ok(!/sendBeacon/.test(src), 'нет sendBeacon');
  assert.ok(!/getUserMedia/.test(src), 'нет getUserMedia');
  assert.ok(!/Math\.random/.test(src), 'нет Math.random');
  assert.ok(!/Date\.now/.test(src), 'нет Date.now (0 часов)');
});

/* порт ≡ канон: js/wsola-core.js (ES2019) в vm с шимом window —
   выход байт в байт равен канону на одной фикстуре */
test('порт js/wsola-core.js ≡ канон байт в байт', () => {
  const путь = new URL('../../../../js/wsola-core.js', import.meta.url);
  const код = fs.readFileSync(путь, 'utf8');
  const шим = { __ВСОЛА: null };
  /* vm-контекст рождает свой Float32Array — даём порту главный
     (в браузере таких расхождений нет: страница одна) */
  vm.runInNewContext(код, { window: шим, Float32Array: globalThis.Float32Array });
  assert.ok(шим.__ВСОЛА, 'порт встал в window.__ВСОЛА');
  assert.equal(шим.__ВСОЛА.имя, 'wsola-core/0.1');
  const фикстура = тон(349.23, 1.3);
  const канон = растянуть(фикстура, { коэффициент: 1.5 });
  const порт = шим.__ВСОЛА.растянуть(копия(фикстура), { коэффициент: 1.5 });
  assert.ok(одинаковые(канон, порт), 'канон и порт совпадают байт в байт');
  const стереоКанон = растянутьСтерео([фикстура, фикстура], { коэффициент: 1.5 });
  const стереоПорт = шим.__ВСОЛА.растянутьСтерео([копия(фикстура), копия(фикстура)], { коэффициент: 1.5 });
  assert.ok(одинаковые(стереоКанон.каналы[0], стереоПорт.каналы[0]), 'стерео тоже байт в байт');
});

/* ── БЕНЧМАРК (честное измерение, не проба): 10 секунд аудио ── */
if (process.env.WSOLA_БЕНЧМАРК === '1') {
  const x = тон(440, 10);
  const строки = [];
  for (const к of [0.5, 1.5, 2.0]) {
    const t0 = process.hrtime.bigint();
    const y = растянуть(x, { коэффициент: к });
    const t1 = process.hrtime.bigint();
    const мс = Number(t1 - t0) / 1e6;
    строки.push('×' + к.toFixed(1) + ': ' + мс.toFixed(1) + ' мс на 10 с аудио (' + y.length + ' сэмплов)');
  }
  console.log('БЕНЧМАРК wsola-core/0.1 (node ' + process.version + '):');
  for (const с of строки) console.log('  ' + с);
}
