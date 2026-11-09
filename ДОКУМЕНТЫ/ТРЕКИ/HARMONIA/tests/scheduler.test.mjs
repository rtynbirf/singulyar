/**
 * Тесты PulseEngine (Фаза 1) — чистая логика на виртуальных аудио-часах.
 * Покрывают: порядок событий, полноту, дрейф-бюджет 25 мс на симуляции 10 минут,
 * паузу/возобновление/seek, смену темпа, стоп при «спящем» потоке, конец партитуры.
 *
 * Важно о секундах: 1 секунда аудио-часов = 1 секунда таймлайна независимо от темпа;
 * темп меняет ДОЛИ в секунду. bpm 120 + tempo 1 → 2 доли/с.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PulseEngine, DRIFT_BUDGET_MS } from '../src/pulse-engine.mjs';
import { SimClock, mulberry32 } from './sim-clock.mjs';

const TICK = 0.025; // 25 мс — тик планировщика из архитектуры
const LOOKAHEAD = 0.120;

/** Прогнать движок по виртуальному времени. Шаг тика = step + случайный джиттер. */
function drive(engine, clock, { untilSec, step = TICK, jitterMaxSec = 0, rng = Math.random } = {}) {
  let t = clock.now();
  while (t < untilSec) {
    t += step + (jitterMaxSec > 0 ? rng() * jitterMaxSec : 0);
    clock.advance(t - clock.now());
    engine.tick();
  }
}

function makeEvents(count, everyBeat = 1) {
  const evs = [];
  for (let i = 0; i < count; i++) {
    evs.push({ beat: i * everyBeat, type: i % 3 === 0 ? 'accent' : 'text', data: { n: i }, alt: `событие ${i}` });
  }
  return evs;
}

test('события диспетчеризуются строго по (время, порядок подачи), каждое ровно один раз', () => {
  const clock = new SimClock();
  const events = makeEvents(300, 1); // bpm 120 → каждые 0.5 с, последнее на 149.5 с
  const fired = [];
  const engine = new PulseEngine({
    clock, events, bpm: 120, useTimer: false,
    onEvent: (ev) => fired.push({ at: ev.at, index: ev.index }),
  });
  engine.play();
  drive(engine, clock, { untilSec: 152, jitterMaxSec: 0.09, rng: mulberry32(1) });

  assert.equal(fired.length, events.length, 'все события сыграны, лишних нет');
  for (let i = 1; i < fired.length; i++) {
    const prev = fired[i - 1], cur = fired[i];
    assert.ok(
      cur.at > prev.at || (cur.at === prev.at && cur.index > prev.index),
      `порядок нарушен на ${i}: ${JSON.stringify(prev)} → ${JSON.stringify(cur)}`,
    );
  }
  fired.forEach((f, i) => assert.equal(f.index, i, 'порядок совпадает с очередью подачи'));
  fired.forEach((f, i) => assert.ok(Math.abs(f.at - i * 0.5) < 1e-9, `аудио-момент события ${i} точен`));
});

test('дрожание таймера страницы до 90 мс: ни одной поздней диспетчеризации (окно 120 мс работает)', () => {
  const clock = new SimClock();
  const rng = mulberry32(42);
  const events = makeEvents(400, 1);
  let maxLate = 0;
  const engine = new PulseEngine({
    clock, events, bpm: 120, useTimer: false,
    onEvent: (ev) => { if (ev.jitterMs > maxLate) maxLate = ev.jitterMs; },
  });
  engine.play();
  // «Плохой таймер»: шаг 25 мс + 0..90 мс → интервал до 115 мс < упреждения 120 мс
  drive(engine, clock, { untilSec: 202, jitterMaxSec: 0.09, rng });
  const d = engine.measureDrift();
  assert.equal(maxLate, 0, 'ни одно событие не опоздало против аудио-часов');
  assert.ok(d.maxEarlyMs <= -0.001 && d.maxEarlyMs >= -120, 'ранние диспетчеризации внутри окна упреждения');
  assert.equal(d.withinBudget, true);
});

test('бюджет дрейфа ≤ 25 мс выдерживается при спайках таймера до 20 мс (интервал до 135 мс)', () => {
  const clock = new SimClock();
  const rng = mulberry32(7);
  const events = makeEvents(400, 1);
  const engine = new PulseEngine({
    clock, events, bpm: 120, useTimer: false,
    onEvent: () => {},
  });
  engine.play();
  // шаг 25..115 мс, каждый 10-й тик — спайк +20 мс (интервал до 135 мс > упреждения)
  let t = 0, n = 0;
  while (t < 202) {
    t += TICK + rng() * 0.09 + (n % 10 === 0 ? 0.02 : 0);
    n++;
    clock.advance(t - clock.now());
    engine.tick();
  }
  const d = engine.measureDrift();
  assert.equal(d.samples, events.length, 'при спайках события не теряются');
  assert.ok(d.maxLateMs <= DRIFT_BUDGET_MS, `поздно максимум ${d.maxLateMs} мс ≤ 25 мс`);
  assert.equal(d.withinBudget, true);
});

test('измеритель честно видит опоздание: тик пришёл на 135 мс позже аудио-момента события → maxLateMs = 135, бюджет нарушен', () => {
  const clock = new SimClock();
  // событие на доле 0.54 (bpm 120 → аудио-момент 0.27 с): при прайм-тике оно
  // ещё ЗА окном упреждения (0.12 с), поэтому спящий поток его задержит
  const engine = new PulseEngine({
    clock, events: [{ beat: 0.54, type: 'accent', data: { strength: 1 }, alt: 'акцент' }],
    bpm: 120, useTimer: false, onEvent: () => {},
  });
  engine.play();
  clock.advance(0.405); // главный поток спал: тик пришёл на 405 мс позже старта
  engine.tick();        // событие с аудио-моментом 0.27 с диспетчеризовано на 0.405 с
  const d = engine.measureDrift();
  assert.equal(d.maxLateMs, 135, 'метрика показывает реальное опоздание, а не ноль для вида');
  assert.equal(d.withinBudget, false);
});

test('дрейф позиции за 10 минут = 0.00 мс: позиция выводится из аудио-часов, а не суммированием шагов', () => {
  const clock = new SimClock();
  const rng = mulberry32(99);
  const events = makeEvents(1200, 1); // 1200 долей = 600 с = 10 минут при bpm 120
  const engine = new PulseEngine({ clock, events, bpm: 120, useTimer: false, onEvent: () => {} });
  engine.play();
  const c0 = clock.now(); // якорь: сразу после play() позиция 0

  const idealSeconds = (audioNow) => audioNow - c0; // 1 аудио-секунда = 1 секунда таймлайна
  let maxPosDriftMs = 0;
  let t = 0, frames = 0;
  while (t < 600) {
    t += TICK + rng() * 0.09; // «плохой таймер» до 115 мс
    clock.advance(t - clock.now());
    engine.tick();
    if (frames % 24 === 0) { // визуальный сэмплер ~60 fps (каждый 24-й кадр проверяем)
      const diff = Math.abs(engine.positionSeconds() - idealSeconds(clock.now())) * 1000;
      if (diff > maxPosDriftMs) maxPosDriftMs = diff;
    }
    frames++;
  }
  assert.ok(maxPosDriftMs <= 0.000001, `дрейф позиции за 10 минут: ${maxPosDriftMs} мс (ожидался 0)`);
});

test('визуальный канал с калибровочным сдвигом читает ровно аудио-время (rAF-петля с джанком)', () => {
  const clock = new SimClock();
  const rng = mulberry32(5);
  const events = makeEvents(1200, 1);
  const engine = new PulseEngine({ clock, events, bpm: 120, useTimer: false, onEvent: () => {} });
  engine.play();
  const c0 = clock.now();
  const bps = (engine.bpm * engine.tempo) / 60; // доли в секунду
  const offsetSec = 0.15; // калибровка пользователя +150 мс (F4)
  let t = 0, frame = 0, maxDriftMs = 0;
  while (t < 60) {
    t += 1 / 60 + (frame % 700 === 0 ? 0.15 : 0); // 60 fps с редким джанком 150 мс
    frame++;
    clock.advance(t - clock.now());
    engine.tick();
    // подсветка строится по визуальному времени = аудио-время − сдвиг (архитектура §3.3)
    const visualBeat = Math.max(0, clock.now() - c0 - offsetSec) * bps;
    const expected = engine.positionBeats(Math.max(0, clock.now() - offsetSec));
    const diffMs = Math.abs(visualBeat - expected) / bps * 1000;
    if (diffMs > maxDriftMs) maxDriftMs = diffMs;
  }
  assert.ok(maxDriftMs <= 0.000001, `визуальное время совпадает с аудио-часами: ${maxDriftMs} мс`);
});

test('наивный планировщик на таймерах страницы уплывает за 10 минут > 25 мс — потому и аудио-часы', () => {
  // Отвергнутая альтернатива (архитектура §2): позиционирование от Date.now/таймеров страницы.
  // Симуляция: стенные часы идут на 0.03% быстрее аудио (расхождение темпов часов).
  const audio = new SimClock();
  const rng = mulberry32(11);
  const wallRate = 1.0003;
  const bps = 1; // bpm 60, tempo 1 → дрейф виден в чистом виде, без усиления темпом

  let wall = 0, t = 0;
  while (t < 600) {
    const step = TICK + rng() * 0.09;
    t += step;
    audio.advance(step);
    wall += step * wallRate;
  }
  const trueBeat = audio.now() * bps;
  const naiveBeat = wall * bps; // позиция, посчитанная от стенных таймеров
  const naiveDriftMs = Math.abs(naiveBeat - trueBeat) * 1000;
  assert.ok(naiveDriftMs > 25, `наивный дрейф за 10 минут: ${naiveDriftMs.toFixed(1)} мс > 25 мс`);

  // PulseEngine на тех же (уже ушедших на 10 минут) часах: якорь, а не накопление.
  // Партитура длиннее прогона (700 долей при bpm 60 = 700 с), чтобы конец не вмешался.
  const engine = new PulseEngine({ clock: audio, events: makeEvents(700, 1), bpm: 60, useTimer: false, onEvent: () => {} });
  engine.play();
  const c0 = audio.now();
  let t2 = 0, maxDrift = 0;
  while (t2 < 600) {
    const step = TICK + rng() * 0.09;
    t2 += step;
    audio.advance(step);
    engine.tick();
    const diff = Math.abs((audio.now() - c0) - engine.positionSeconds()) * 1000;
    if (diff > maxDrift) maxDrift = diff;
  }
  assert.ok(maxDrift <= 0.000001, `дрейф PulseEngine на тех же часах: ${maxDrift} мс`);
});

test('pause/resume: позиция заморожена, событий в паузе нет, после возобновления всё доигрывается', () => {
  const clock = new SimClock();
  const events = makeEvents(100, 1);
  const fired = [];
  const engine = new PulseEngine({
    clock, events, bpm: 120, useTimer: false,
    onEvent: (ev) => fired.push(ev.index),
  });
  engine.play();
  drive(engine, clock, { untilSec: 25, jitterMaxSec: 0.05, rng: mulberry32(3) });
  const pausedAtBeat = engine.pause();
  const firedAtPause = fired.length;
  assert.equal(engine.playing, false);
  assert.ok(firedAtPause > 40 && firedAtPause < 52, `к паузе сыграли события до 25 с (сейчас ${firedAtPause})`);

  const posBefore = engine.positionBeats();
  clock.advance(5); // часы идут, плеер стоит
  assert.equal(engine.positionBeats(), posBefore, 'позиция в паузе не течёт');

  engine.play();
  assert.ok(Math.abs(engine.positionBeats() - pausedAtBeat) < 1e-9, 'возобновление с того же места');
  drive(engine, clock, { untilSec: clock.now() + 60, jitterMaxSec: 0.05, rng: mulberry32(4) });
  assert.equal(fired.length, events.length, 'все события доиграны после паузы');
  assert.equal(new Set(fired).size, fired.length, 'дубликатов нет');
});

test('seek вперёд пропускает прошедшее без переигрывания, seek назад перевзводит будущее', () => {
  const clock = new SimClock();
  const events = makeEvents(100, 1);
  const fired = [];
  let ends = 0;
  const engine = new PulseEngine({
    clock, events, bpm: 120, useTimer: false,
    onEvent: (ev) => fired.push(ev.index),
    onEnd: () => ends++,
  });
  engine.seek(60); // к доле 60 = 30 с таймлайна, ещё до старта: прошедшее под взвод не попадает
  engine.play();   // прайм-тик играет только событие на самой позиции (№60)
  assert.deepEqual(
    fired.filter((i) => i < 60), [],
    'ничего из прошедшего не переиграно задним числом (событие на самой позиции — играется)',
  );
  assert.equal(engine.positionBeats(), 60);

  drive(engine, clock, { untilSec: 5, jitterMaxSec: 0.05, rng: mulberry32(6) });
  // 5 с после seek → события долей 60..70 (№60 — прайм-тиком на старте), ровно 11 штук
  assert.equal(fired.length, 11, `сыграны события от точки seek (сейчас ${fired.length})`);
  assert.equal(Math.min(...fired), 60, 'первое после seek — событие на самой позиции');
  assert.equal(new Set(fired).size, fired.length, 'без дублей');

  engine.seek(0); // назад в начало: будущие события перевзводятся
  drive(engine, clock, { untilSec: clock.now() + 90, jitterMaxSec: 0.05, rng: mulberry32(8) });
  assert.equal(new Set(fired).size, events.length, 'вся партитура пройдена после seek назад');
  assert.equal(ends, 1, 'onEnd ровно один раз');
  assert.equal(engine.playing, false, 'в конце — честный стоп');
});

test('конец партитуры: onEnd один раз, повторный play() начинает с нуля', () => {
  const clock = new SimClock();
  let ends = 0;
  const engine = new PulseEngine({
    clock, events: makeEvents(20, 1), bpm: 120, useTimer: false,
    onEvent: () => {}, onEnd: () => ends++,
  });
  engine.play();
  drive(engine, clock, { untilSec: 12 });
  assert.equal(ends, 1);
  assert.equal(engine.playing, false);
  assert.equal(engine.positionBeats(), engine.endBeat, 'стоим на конце');
  engine.play();
  assert.equal(engine.positionBeats(), 0, 'новый заход — с начала');
});

test('смена темпа на ходу: доля-якорь не скачет, события не теряются и не дублируются', () => {
  const clock = new SimClock();
  const events = makeEvents(120, 1);
  const fired = [];
  const engine = new PulseEngine({
    clock, events, bpm: 120, useTimer: false,
    onEvent: (ev) => fired.push(ev.index),
  });
  engine.play();
  drive(engine, clock, { untilSec: 20, jitterMaxSec: 0.05, rng: mulberry32(13) });
  const beatBefore = engine.positionBeats();
  engine.setTempo(1.5);
  assert.ok(Math.abs(engine.positionBeats() - beatBefore) < 1e-9, 'позиция в долях не изменилась');
  drive(engine, clock, { untilSec: clock.now() + 80, jitterMaxSec: 0.05, rng: mulberry32(14) });
  assert.equal(fired.length, events.length);
  assert.equal(new Set(fired).size, fired.length);
  assert.equal(engine.tempo, 1.5);
});

test('спящий поток дольше maxStallMs → честная пауза и onStall, а не рассинхрон', () => {
  const clock = new SimClock();
  const stalls = [];
  const engine = new PulseEngine({
    clock, events: makeEvents(50, 1), bpm: 120, useTimer: false, maxStallMs: 1000,
    onStall: (s) => stalls.push(s),
  });
  engine.play();
  drive(engine, clock, { untilSec: 5, jitterMaxSec: 0.05, rng: mulberry32(15) });
  clock.advance(2.5); // вкладка уснула на 2.5 с
  engine.tick();
  assert.equal(stalls.length, 1, 'onStall получен');
  assert.equal(engine.playing, false, 'движок остановлен');
  assert.ok(stalls[0].stallMs >= 2500 - 1);
});

test('measureDrift(): форма отчёта, бюджет 25 мс, сброс; конструктор без часов честно бросает', () => {
  const clock = new SimClock();
  const engine = new PulseEngine({
    clock, events: makeEvents(20, 1), bpm: 120, useTimer: false,
    onEvent: () => {},
  });
  engine.play();
  drive(engine, clock, { untilSec: 11, jitterMaxSec: 0.05, rng: mulberry32(16) });
  const d = engine.measureDrift();
  assert.equal(d.samples, 20);
  assert.ok(d.maxLateMs <= DRIFT_BUDGET_MS);
  assert.equal(d.withinBudget, true);
  assert.ok(d.maxEarlyMs <= 0 && d.maxEarlyMs >= -120, 'ранние диспетчеризации в пределах окна');
  engine.resetDrift();
  const z = engine.measureDrift();
  assert.deepEqual(z, { samples: 0, maxLateMs: 0, maxEarlyMs: 0, lateCount: 0, budgetMs: 25, withinBudget: true });

  assert.throws(() => new PulseEngine({ events: [] }), TypeError, 'без часов движок не строится');
});
