#!/usr/bin/env node
/**
 * ГАРМОНИЯ · измерение дрейфа планировщика на симуляции (не node:test — запускается руками):
 *
 *   node tests/drift-measure.mjs            # прогон по умолчанию (5 сидов × 10 минут)
 *   node tests/drift-measure.mjs --seeds 12 --minutes 10
 *
 * Что меряем (критерий F3 / дорожная карта: дрейф ≤ 25 мс за 10 минут):
 *  1. Дрожание диспетчеризации против аудио-часов — measureDrift() движка:
 *     максимум опоздания maxLateMs (бюджет 25 мс относится к нему), ранние
 *     диспетчеризации внутри окна упреждения 120 мс.
 *  2. Дрейф ПОЗИЦИИ против аудио-часов — по построению 0 (позиция выводится
 *     из часов от якоря), проверяем фактическим сэмплированием.
 *
 * «Плохой таймер страницы»: тик 25 мс + джиттер 0..90 мс (интервал до 115 мс)
 * и спайк +20 мс каждый 10-й тик (интервал до 135 мс > окна упреждения) —
 * как в tests/scheduler.test.mjs, только дольше и по нескольким сидам.
 *
 * Ноль зависимостей, ноль сети. Детерминированно: ГПСЧ mulberry32.
 */
import { PulseEngine, DRIFT_BUDGET_MS } from '../src/pulse-engine.mjs';
import { SimClock, mulberry32 } from './sim-clock.mjs';

const TICK = 0.025;              // тик планировщика, сек
const JITTER_MAX = 0.09;         // дрожание таймера страницы, сек
const SPIKE_EVERY = 10;          // каждый 10-й тик…
const SPIKE_SEC = 0.02;          // …длиннее на 20 мс (интервал до 135 мс)

function makeEvents(count, everyBeat = 1) {
  const evs = [];
  for (let i = 0; i < count; i++) {
    evs.push({ beat: i * everyBeat, type: i % 3 === 0 ? 'accent' : 'text', data: { n: i }, alt: `событие ${i}` });
  }
  return evs;
}

function run({ seed, minutes }) {
  const clock = new SimClock();
  const rng = mulberry32(seed);
  // bpm 120 → 2 доли/с: партитура ровно на minutes минут, последнее событие за 0.5 с до конца
  const events = makeEvents(Math.round(minutes * 60 * 2), 1);
  const engine = new PulseEngine({ clock, events, bpm: 120, useTimer: false, onEvent: () => {} });
  engine.play();
  const c0 = clock.now();

  let t = 0, n = 0, maxPosDriftMs = 0;
  while (t < minutes * 60) {
    t += TICK + rng() * JITTER_MAX + (n % SPIKE_EVERY === 0 ? SPIKE_SEC : 0);
    n++;
    clock.advance(t - clock.now());
    engine.tick();
    if (engine.playing) { // после честного стопа на конце партитуры позиция заморожена — не меряем
      const diff = Math.abs(engine.positionSeconds() - (clock.now() - c0)) * 1000;
      if (diff > maxPosDriftMs) maxPosDriftMs = diff;
    }
  }
  const d = engine.measureDrift();
  return {
    seed,
    minutes,
    fired: d.samples,
    expected: events.length,
    allFired: d.samples === events.length,
    maxLateMs: d.maxLateMs,
    maxEarlyMs: d.maxEarlyMs,
    lateCount: d.lateCount,
    maxPosDriftMs: Math.round(maxPosDriftMs * 1000) / 1000,
    budgetMs: d.budgetMs,
    withinBudget: d.withinBudget,
  };
}

/* ---------- аргументы и прогон ---------- */
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) || def : def;
};
const seeds = opt('seeds', 5);
const minutes = opt('minutes', 10);

console.log(`Дрейф планировщика · симуляция ${minutes} мин · «плохой таймер» 25+0..90 мс, спайк +20 мс каждый 10-й тик`);
console.log(`Бюджет фазы: ≤ ${DRIFT_BUDGET_MS} мс · окно упреждения 120 мс · тик 25 мс · bpm 120\n`);

const rows = [];
let worst = { maxLateMs: -1, maxPosDriftMs: -1 };
for (let s = 1; s <= seeds; s++) {
  const r = run({ seed: s, minutes });
  rows.push(r);
  if (r.maxLateMs > worst.maxLateMs) worst.maxLateMs = r.maxLateMs;
  if (r.maxPosDriftMs > worst.maxPosDriftMs) worst.maxPosDriftMs = r.maxPosDriftMs;
  console.log(
    `сид ${String(r.seed).padStart(2)} · событий ${r.fired}/${r.expected}` +
    ` · поздно макс ${r.maxLateMs.toFixed(3)} мс · рано макс ${r.maxEarlyMs.toFixed(1)} мс` +
    ` · опоздавших ${r.lateCount} · дрейф позиции ${r.maxPosDriftMs.toFixed(3)} мс` +
    ` · в бюджете: ${r.withinBudget ? 'ДА' : 'НЕТ'}`,
  );
}

const ok = worst.maxLateMs <= DRIFT_BUDGET_MS && rows.every((r) => r.allFired);
console.log(`\nИТОГ: худший maxLateMs = ${worst.maxLateMs.toFixed(3)} мс из ${seeds} прогонов` +
  ` · худший дрейф позиции = ${worst.maxPosDriftMs.toFixed(3)} мс` +
  ` · цель ≤ ${DRIFT_BUDGET_MS} мс: ${ok ? 'ВЫДЕРЖАНА' : 'НАРУШЕНА'}`);
process.exitCode = ok ? 0 : 1;
