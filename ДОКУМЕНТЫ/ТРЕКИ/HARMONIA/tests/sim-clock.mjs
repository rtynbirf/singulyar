/**
 * Тестовые часы для PulseEngine (node:test).
 * SimClock — «аудио-часы» (в браузере это AudioContext.currentTime).
 * wallRate — симуляция расхождения стенных таймеров страницы с аудио-часами.
 */

export class SimClock {
  constructor({ t = 0 } = {}) { this._t = t; }
  now() { return this._t; }
  advance(sec) { this._t += sec; return this._t; }
}

/** Детерминированный ГПСЧ — тесты повторяемы. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
