/**
 * ГАРМОНИЯ · core/pulse — PulseEngine (Фаза 1)
 * ------------------------------------------------------------------
 * Единые аудио-часы: вся позиция выводится из clock.now() — в браузере это
 * AudioContext.currentTime (03_ARCHITECTURE.md §2). Таймеры страницы и
 * Date.now для позиции НЕ используются — это отвергнутая альтернатива,
 * они дрожат и замедляются в фоновой вкладке.
 *
 * Модель времени: события .harm заданы в долях (beat). Секунда события =
 * beat * (60/bpm) / tempo. Смена темпа, пауза и seek не накапливают дрейф:
 * позиция всегда пересчитывается от якоря (anchorClock, anchorBeat), а не
 * суммированием шагов.
 *
 * Планировщик (архитектура §3.1): тик каждые 25 мс; в окне упреждения
 * ~120 мс события ставятся в очередь по аудио-часам. Событие диспетчеризуется
 * ЗАРАНЕЕ (до наступления) и несёт точный аудио-момент `at` — показание
 * АУДИО-ЧАСОВ, в которое наступит событие (годится для osc.start(at) напрямую);
 * потребитель применяет его, когда часы дойдут до `at` (для текста/света —
 * requestAnimationFrame, время = currentTime − задержка вывода − сдвиг
 * пользователя). Поэтому дрожание JS-таймера не сдвигает время применения:
 * дрейф позиции относительно аудио-часов равен нулю по построению, а
 * измеряется честно — дрожание диспетчеризации (см. measureDrift()).
 *
 * Аудио-момент события считается от ЯКОРЯ (anchorClock, anchorBeat), а не как
 * абсолютная секунда таймлайна: anchorClock + beatToSec(beat − anchorBeat).
 * Тогда пауза/возобновление, seek и смена темпа (каждый переносит якорь) не
 * порождают ни всплеска «задним числом», ни пропуска событий — планировщик
 * остаётся верным на любых часах (AudioContext.currentTime не обязан начинаться
 * с нуля относительно старта воспроизведения).
 *
 * Ноль зависимостей. Часы инжектятся: в node:test — виртуальные, в браузере — аудио.
 * Правила поведения при остановке: вкладка спала дольше maxStallMs → честная пауза
 * (onStall), а не продолжение рассинхронизированным (архитектура §3.4).
 */

const DEFAULT_LOOKAHEAD_MS = 120; // упреждение планировщика
const DEFAULT_TICK_MS = 25;       // тик планировщика
const DEFAULT_MAX_STALL_MS = 1000; // прыжок часов дольше этого = честная пауза
const DRIFT_BUDGET_MS = 25;       // критерий фазы: дрейф ≤ 25 мс

class PulseEngine {
  /**
   * @param {Object} options
   * @param {{now():number}} options.clock    аудио-часы, секунды, монотонные (обязателен)
   * @param {Array}  options.events           события [{beat, type, data, alt, ...}] — в долях
   * @param {number} [options.bpm=120]        30..240
   * @param {number} [options.tempo=1]        0.5..1.5 — темп пользователя
   * @param {number} [options.endBeat]        конец партитуры (по умолчанию — последний beat)
   * @param {Function} [options.onEvent]      ({beat, at, type, data, alt, index, jitterMs, late})
   * @param {Function} [options.onEnd]        ({beat})
   * @param {Function} [options.onSeek]       ({beat})
   * @param {Function} [options.onStall]      ({stallMs, beat})
   * @param {number} [options.lookaheadMs=120]
   * @param {number} [options.tickMs=25]
   * @param {number} [options.maxStallMs=1000]
   * @param {boolean} [options.useTimer=true] false — тесты водят tick() руками
   */
  constructor(options = {}) {
    const o = { ...options };
    this._clock = o.clock;
    if (!this._clock || typeof this._clock.now !== 'function') {
      throw new TypeError('PulseEngine: нужен clock { now() } — аудио-часы (AudioContext.currentTime в браузере)');
    }
    this._bpm = PulseEngine._clampNumber(o.bpm ?? 120, 30, 240, 120);
    this._tempo = PulseEngine._clampNumber(o.tempo ?? 1, 0.5, 1.5, 1);
    this._lookaheadSec = Math.max(0.01, (o.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS) / 1000);
    this._tickMs = Math.max(5, o.tickMs ?? DEFAULT_TICK_MS);
    this._maxStallSec = Math.max(0.05, (o.maxStallMs ?? DEFAULT_MAX_STALL_MS) / 1000);
    this._useTimer = o.useTimer !== false;

    // события в долях; устойчивый порядок: (beat, порядок подачи)
    this._events = (Array.isArray(o.events) ? o.events.slice() : [])
      .map((ev, i) => ({ ...ev, _i: i }))
      .sort((a, b) => (a.beat - b.beat) || (a._i - b._i));
    this._endBeat = (o.endBeat ?? PulseEngine._endBeatOf(this._events)) || 0;

    this._onEvent = typeof o.onEvent === 'function' ? o.onEvent : () => {};
    this._onEnd = typeof o.onEnd === 'function' ? o.onEnd : () => {};
    this._onSeek = typeof o.onSeek === 'function' ? o.onSeek : () => {};
    this._onStall = typeof o.onStall === 'function' ? o.onStall : () => {};

    this._anchorClock = this._clock.now(); // момент аудио-часов, отвечающий _anchorBeat
    this._anchorBeat = 0;
    this._playing = false;
    this._nextIdx = 0;
    this._ended = false;
    this._lastTickClock = this._anchorClock;
    this._timer = null;
    this._drift = PulseEngine._freshDrift();
  }

  /* ---------- константы и мелкая утилита ---------- */
  static get DRIFT_BUDGET_MS() { return DRIFT_BUDGET_MS; }
  static _freshDrift() { return { samples: 0, maxLateMs: 0, maxEarlyMs: 0, lateCount: 0 }; }
  static _clampNumber(v, min, max, def) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  }
  static _endBeatOf(events) {
    let m = 0;
    for (const ev of events) if (Number.isFinite(ev.beat) && ev.beat > m) m = ev.beat;
    return m;
  }

  /* ---------- conversion beat <-> секунды ---------- */
  get bpm() { return this._bpm; }
  get tempo() { return this._tempo; }
  get endBeat() { return this._endBeat; }
  get playing() { return this._playing; }
  spb() { return 60 / this._bpm; }                            // секунд на долю при tempo=1
  beatToSec(beat) { return (beat * this.spb()) / this._tempo; }
  secToBeat(sec) { return (sec * this._tempo) / this.spb(); }

  /**
   * Аудио-момент доли на текущих часах: показание clock.now(), в которое
   * позиция дойдёт до `beat`. Верно, пока идёт воспроизведение от текущего
   * якоря (тик при паузе не вызывается — позиция заморожена).
   */
  _audioTimeOf(beat) { return this._anchorClock + this.beatToSec(beat - this._anchorBeat); }

  /** Позиция в долях. Пока стоит на паузе — заморожена, часы не текут в позицию. */
  positionBeats(now = this._clock.now()) {
    if (!this._playing) return this._anchorBeat;
    return this._anchorBeat + this.secToBeat(now - this._anchorClock);
  }
  positionSeconds(now = this._clock.now()) { return this.beatToSec(this.positionBeats(now)); }

  /* ---------- управление ---------- */
  play() {
    if (this._playing) return this.positionBeats();
    if (this._anchorBeat >= this._endBeat) { this._anchorBeat = 0; this._ended = false; } // заново с начала
    this._anchorClock = this._clock.now();
    this._lastTickClock = this._anchorClock;
    this._nextIdx = this._indexAfter(this._anchorBeat);
    this._playing = true;
    if (this._useTimer) this._startTimer();
    this.tick(); // прайм-тик: события в окне упреждения от якоря встают в очередь сразу, а не ждут первого тика таймера
    return this.positionBeats();
  }

  pause() {
    if (!this._playing) return this._anchorBeat;
    this._anchorBeat = this.positionBeats();
    this._playing = false;
    this._stopTimer();
    return this._anchorBeat;
  }

  toggle() { return this._playing ? this.pause() : this.play(); }

  /** Переход к доле. Прошедшие события не переигрываются, будущие перевзводятся. */
  seek(beat) {
    const b = Math.min(this._endBeat, Math.max(0, Number(beat) || 0));
    this._anchorBeat = b;
    this._nextIdx = this._indexAfter(b);
    if (b < this._endBeat) this._ended = false;
    if (this._playing) {
      this._anchorClock = this._clock.now();
      this._lastTickClock = this._anchorClock;
    }
    this._onSeek({ beat: b });
    return b;
  }

  /** Темп пользователя: якорь переустанавливается на текущей доле — без скачка и без дрейфа. */
  setTempo(mult) {
    const t = PulseEngine._clampNumber(mult, 0.5, 1.5, this._tempo);
    if (t === this._tempo) return t;
    const b = this.positionBeats();
    this._tempo = t;
    this._anchorBeat = b;
    this._anchorClock = this._clock.now();
    this._lastTickClock = this._anchorClock;
    return t;
  }

  setBpm(bpm) {
    const b = PulseEngine._clampNumber(bpm, 30, 240, this._bpm);
    if (b === this._bpm) return b;
    const beat = this.positionBeats();
    this._bpm = b;
    this._anchorBeat = beat;
    this._anchorClock = this._clock.now();
    this._lastTickClock = this._anchorClock;
    return b;
  }

  dispose() { this._stopTimer(); this._playing = false; }

  /* ---------- планировщик ---------- */
  /**
   * Один тик планировщика. В браузере зовётся интервалом каждые tickMs;
   * в тестах — руками от виртуальных часов. `now` — аудио-секунды.
   */
  tick(now = this._clock.now()) {
    if (!this._playing) return;
    const gap = now - this._lastTickClock;
    if (gap > this._maxStallSec) {
      // Главный поток спал (фон, джанк) — останавливаемся честно, не рассинхронизируемся.
      this.pause();
      this._onStall({ stallMs: gap * 1000, beat: this._anchorBeat });
      return;
    }
    this._lastTickClock = now;
    const horizon = now + this._lookaheadSec;
    while (this._nextIdx < this._events.length) {
      const ev = this._events[this._nextIdx];
      const at = this._audioTimeOf(ev.beat); // аудио-момент события на часах
      if (at > horizon) break;
      this._nextIdx++;
      if (at < now - this._maxStallSec) continue; // безнадёжно в прошлом (после «спящего» периода) — пропускаем
      const jitterMs = (now - at) * 1000;         // + = поздно, − = рано (норма — окно упреждения)
      const d = this._drift;
      d.samples++;
      if (jitterMs > d.maxLateMs) d.maxLateMs = jitterMs;
      if (jitterMs < d.maxEarlyMs) d.maxEarlyMs = jitterMs;
      if (jitterMs > 0) d.lateCount++;
      this._onEvent({
        beat: ev.beat, at, type: ev.type, data: ev.data, alt: ev.alt,
        index: ev._i, jitterMs, late: jitterMs > 0,
      });
    }
    if (!this._ended && this.positionBeats(now) >= this._endBeat) {
      this._ended = true;
      const endBeat = this._endBeat;
      this.pause();       // стоим на конце
      this._anchorBeat = endBeat; // зажим: останавливаемся ровно на конце партитуры
      this._onEnd({ beat: endBeat });
    }
  }

  _indexAfter(beat) { // первый индекс с beatToSec(ev.beat) >= позиция (событие «сейчас» — играется)
    const pos = this.beatToSec(beat);
    const eps = 1e-9;
    let lo = 0, hi = this._events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.beatToSec(this._events[mid].beat) < pos - eps) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  _startTimer() { if (this._timer === null) this._timer = setInterval(() => this.tick(), this._tickMs); }
  _stopTimer() { if (this._timer !== null) { clearInterval(this._timer); this._timer = null; } }

  /* ---------- измеритель дрейфа ---------- */
  /**
   * Честная метрика фазы. Возвращает дрожание диспетчеризации против аудио-часов:
   * jitterMs = (момент диспетчеризации) − (аудио-момент события).
   * Положительная часть (поздно) обязана быть ≤ 25 мс — это и есть бюджет дрейфа:
   * позиция выводится из аудио-часов напрямую (отдельного «дрейфа позиции»
   * не существует), поэтому опоздать может только сама очередь, а время
   * применения у потребителя всегда точное (по `at`).
   */
  measureDrift() {
    const d = this._drift;
    const r3 = (x) => Math.round(x * 1000) / 1000;
    return {
      samples: d.samples,
      maxLateMs: r3(d.maxLateMs),
      maxEarlyMs: r3(d.maxEarlyMs),
      lateCount: d.lateCount,
      budgetMs: DRIFT_BUDGET_MS,
      withinBudget: d.maxLateMs <= DRIFT_BUDGET_MS,
    };
  }
  resetDrift() { this._drift = PulseEngine._freshDrift(); }
}

export { PulseEngine, DRIFT_BUDGET_MS };
