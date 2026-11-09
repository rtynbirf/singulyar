/**
 * ГАРМОНИЯ · src/clap-detector — детектор хлопков (Фаза 2–3, задача Г3)
 * ------------------------------------------------------------------
 * Что это: детектор хлопков в аудиопотоке — чистая DSP-логика, тестируемая
 * в node, + обвязка AudioWorkletNode для браузера. Ноль сети, ноль
 * зависимостей, внешних импортов нет (как и во всех src/*.mjs трека).
 *
 * Алгоритм (эмпирический, окно за окном):
 *   1. Энергия кадров: корень не нужен — считаем среднее квадрата сэмпла
 *      в окнах FRAME_MS (5 мс) без перекрытия.
 *   2. Адаптивный порог: медиана энергий СКЛЬЗЯЩЕГО окна прошлого
 *      (MEDIAN_MS = 500 мс, прошлые кадры — текущий в свой порог не входит)
 *      × THRESH_RATIO (5), с нижней планкой ABS_FLOOR — тишина не детонирует.
 *   3. Хлопок = резкий рост (энергия ≥ RISE_RATIO × предыдущего кадра),
 *      пробившая порог, со СПАДОМ: не позже DECAY_MAX_MS (120 мс) энергия
 *      падает ≤ DECAY_FRACTION (25%) от пика окна. Держится дольше — это
 *      не хлопок (речь, тон, постоянный шум) — честный отказ и пауза
 *      прослушивания до спада.
 *   4. Рефрактерность: между принятыми хлопками ≥ MIN_INTERVAL_MS (180 мс).
 *   5. Двойной хлопок: два принятых хлопка с интервалом 180–600 мс дают
 *      ОТДЕЛЬНОЕ событие «двойной» (сразу после второго хлопка пары).
 *
 * Архитектура обвязки (честно): в аудио-поток ставится крошечное реле —
 * AudioWorkletProcessor, который ТОЛЬКО пересылает блоки сэмплов с их
 * абсолютным индексом (currentFrame) на главный поток. Весь разбор ведёт
 * ТОТ ЖЕ ClapTracker, что протестирован в node — дублирующей неподписанной
 * DSP-копии в аудио-потоке нет. Времена событий считаются от абсолютного
 * индекса сэмпла (аудио-часы), а не от стенных таймеров.
 *
 * Честный фолбэк: если AudioWorklet недоступен (старый браузер, node,
 * отключённый API), createClapDetector возвращает { ok:false, причина } с
 * безопасными no-op start/stop. ИМИТАЦИИ ДЕТЕКТОРА НЕТ — на таймерах
 * страницы и «угадывании» хлопки не ищутся.
 *
 * Известные границы: порог эмпирический (проверен на синтетике тестов);
 * громкая музыка из колонок даёт ложные срабатывания — наушники или тихий
 * режим (ограничение прототипа остаётся в силе); живой микрофонный прогон —
 * отдельная строка фазы 3.
 */

const FRAME_MS = 5;        // окно энергии
const WARMUP_MS = 200;     // разогрев: пока истории мало — не детектируем
const MEDIAN_MS = 500;     // скользящее окно медианы (прошлое)
const THRESH_RATIO = 5;    // порог = медиана прошлого × 5
const ABS_FLOOR = 1e-5;    // нижняя планка порога (энергия), тишина не детонирует
const RISE_RATIO = 3;      // «резкий рост»: ≥ 3× энергия предыдущего кадра
const DECAY_FRACTION = 0.25; // спад: ≤ 25% пика окна
const DECAY_MAX_MS = 120;  // спад обязан случиться не позже этого
const MIN_INTERVAL_MS = 180; // рефрактерность между принятыми хлопками
const DOUBLE_MIN_MS = 180; // двойной: интервал от …
const DOUBLE_MAX_MS = 600; // …до этого

const CLAP_PARAMS = {
  FRAME_MS, WARMUP_MS, MEDIAN_MS, THRESH_RATIO, ABS_FLOOR, RISE_RATIO,
  DECAY_FRACTION, DECAY_MAX_MS, MIN_INTERVAL_MS, DOUBLE_MIN_MS, DOUBLE_MAX_MS,
};

/**
 * Потоковое состояние детектора. Чистая логика без DOM/сети: кормим сэмплами
 * (feed), получаем события. Используется и в node-тестах, и браузерной
 * обвязкой AudioWorkletNode — один и тот же код.
 *
 * Событие хлопка: { t, энергия, индекс, тип:'хлопок' }
 *   t      — секунды от начала потока (аудио-часы: абсолютный индекс сэмпла / sampleRate);
 *   энергия — пик энергии окна за время проверки (среднее квадрата сэмпла);
 *   индекс  — абсолютный индекс первого сэмпла кадра-вспышки.
 * Событие двойного: { t, t2, интервалМс, индекс, энергия, тип:'двойной' }
 *   (t — первый хлопок пары, t2 — второй, энергия — max из двух).
 */
class ClapTracker {
  /**
   * @param {Object} options
   * @param {number} options.sampleRate  Гц, обязателен (например 48000)
   * @param {Function} [options.onClap]  колбэк события {t, энергия, индекс, тип, ...}
   */
  constructor(options = {}) {
    const sr = Number(options.sampleRate);
    if (!Number.isFinite(sr) || sr <= 0) {
      throw new TypeError('ClapTracker: нужен sampleRate (Гц), например 48000');
    }
    this._sr = sr;
    this._onClap = typeof options.onClap === 'function' ? options.onClap : () => {};
    this._frameLen = Math.max(1, Math.round((sr * FRAME_MS) / 1000));
    this._frameSec = this._frameLen / sr;
    this._warmupFrames = Math.max(2, Math.round(WARMUP_MS / FRAME_MS));
    this._scanFrames = Math.max(2, Math.round(DECAY_MAX_MS / FRAME_MS));
    this._medianFrames = Math.max(3, Math.round(MEDIAN_MS / FRAME_MS));
    this.reset();
  }

  /** Полный сброс: история, порог, рефрактерность, счётчик сэмплов — с нуля. */
  reset() {
    this._pendingN = 0;          // сэмплов набрано в незакрытый кадр
    this._sumSq = 0;             // сумма квадратов незакрытого кадра
    this._samplesFed = 0;        // всего сэмплов принято с последнего reset
    this._sampleBase = 0;        // абсолютный индекс сэмпла №0 потока (синхронизация)
    this._synced = false;        // получен ли уже абсолютный индекс от реле
    this._framesSeen = 0;
    this._prevEnergy = 0;
    this._state = 'listening';   // listening | tracking | suppressed
    this._scan = null;           // { onsetFrame, peak, frames } при tracking
    this._suppressLevel = 0;     // порог выхода из suppressed
    this._prevAccepted = null;   // { t, энергия, индекс } последнего принятого хлопка
    this._hist = new Float64Array(this._medianFrames); // кольцо энергий прошлого
    this._histLen = 0;
    this._histPos = 0;
  }

  /** Сколько сэмплов принято с последнего reset (честная интроспекция). */
  get samplesFed() { return this._samplesFed; }

  /**
   * Скормить блок сэмплов (Float32Array/Array).
   * @param {Float32Array|Array} buffer
   * @param {Object} [opts]
   * @param {number} [opts.sampleOffset] абсолютный индекс первого сэмпла блока
   *   (в браузере реле присылает currentFrame). Первое значение фиксирует
   *   базу времени, расхождение дальше честно пересинхронизирует базу.
   * @returns {Array} новые события (те же, что ушли в onClap)
   */
  feed(buffer, opts = {}) {
    if (!buffer || typeof buffer.length !== 'number') {
      throw new TypeError('ClapTracker.feed: нужен буфер сэмплов (Float32Array/Array)');
    }
    const offset = opts.sampleOffset;
    if (typeof offset === 'number' && Number.isFinite(offset)) {
      if (!this._synced) {
        this._sampleBase = offset - this._samplesFed;
        this._synced = true;
      } else {
        const expected = this._sampleBase + this._samplesFed;
        if (offset !== expected) this._sampleBase = offset - this._samplesFed;
      }
    }
    const events = [];
    const n = buffer.length;
    let i = 0;
    while (i < n) {
      const take = Math.min(this._frameLen - this._pendingN, n - i);
      for (let k = 0; k < take; k++) {
        const s = buffer[i + k];
        this._sumSq += s * s;
      }
      this._pendingN += take;
      i += take;
      if (this._pendingN === this._frameLen) {
        const ev = this._processFrame(this._sumSq / this._frameLen);
        for (let e = 0; e < ev.length; e++) events.push(ev[e]);
        this._pendingN = 0;
        this._sumSq = 0;
      }
    }
    this._samplesFed += n;
    return events;
  }

  _timeOfSample(sampleIndex) { return (this._sampleBase + sampleIndex) / this._sr; }

  /** Медиана энергий ПРОШЛЫХ кадров (текущий ещё не в истории). */
  _medianOfHistory() {
    const n = this._histLen;
    if (n === 0) return 0;
    const buf = new Float64Array(n);
    for (let i = 0; i < n; i++) buf[i] = this._hist[i];
    buf.sort();
    return n % 2 === 1 ? buf[(n - 1) / 2] : (buf[n / 2 - 1] + buf[n / 2]) / 2;
  }

  _processFrame(energy) {
    const out = [];
    const frameIndex = this._framesSeen;
    this._framesSeen++;
    const med = this._medianOfHistory();
    const thresh = Math.max(med * THRESH_RATIO, ABS_FLOOR);

    if (this._state === 'listening') {
      if (this._framesSeen > this._warmupFrames) {
        const riseOk = energy >= RISE_RATIO * this._prevEnergy;
        const refrOk = !this._prevAccepted ||
          (this._timeOfSample(frameIndex * this._frameLen) - this._prevAccepted.t) * 1000 >= MIN_INTERVAL_MS;
        if (energy >= thresh && riseOk && refrOk) {
          this._state = 'tracking';
          this._scan = { onsetFrame: frameIndex, peak: energy, frames: 1 };
        }
      }
    } else if (this._state === 'tracking') {
      const s = this._scan;
      if (energy > s.peak) s.peak = energy;
      s.frames++;
      if (energy <= DECAY_FRACTION * s.peak) {
        // спад случился — хлопок принят
        const tOn = this._timeOfSample(s.onsetFrame * this._frameLen);
        const idx = this._sampleBase + s.onsetFrame * this._frameLen;
        out.push({ t: tOn, энергия: s.peak, индекс: idx, тип: 'хлопок' });
        if (this._prevAccepted) {
          const gapMs = (tOn - this._prevAccepted.t) * 1000;
          if (gapMs >= DOUBLE_MIN_MS && gapMs <= DOUBLE_MAX_MS) {
            out.push({
              t: this._prevAccepted.t, t2: tOn, интервалМс: Math.round(gapMs),
              индекс: this._prevAccepted.индекс,
              энергия: Math.max(this._prevAccepted.энергия, s.peak), тип: 'двойной',
            });
          }
        }
        this._prevAccepted = { t: tOn, энергия: s.peak, индекс: idx };
        this._state = 'listening';
        this._scan = null;
      } else if (s.frames >= this._scanFrames) {
        // 120 мс без спада — это не хлопок (тон/речь/шум): честный отказ,
        // слушаем снова только после спада
        this._state = 'suppressed';
        this._suppressLevel = DECAY_FRACTION * s.peak;
        this._scan = null;
      }
    } else { // suppressed
      if (energy <= this._suppressLevel) this._state = 'listening';
    }

    this._prevEnergy = energy;
    this._hist[this._histPos] = energy;
    this._histPos = (this._histPos + 1) % this._hist.length;
    if (this._histLen < this._hist.length) this._histLen++;
    for (let e = 0; e < out.length; e++) this._onClap(out[e]);
    return out;
  }
}

/**
 * Разовый (офлайн) анализ: буфер целиком → массив событий.
 * Удобно в тестах и для разбора записей; в живом потоке работает ClapTracker.
 * @param {Float32Array|Array} buffer сэмплы [-1..1]
 * @param {number} sampleRate Гц
 * @returns {Array} события {t, энергия, индекс, тип} (+t2/интервалМс у «двойной»)
 */
function detectClaps(buffer, sampleRate) {
  const events = [];
  const tracker = new ClapTracker({ sampleRate, onClap: (ev) => events.push(ev) });
  tracker.feed(buffer);
  return events;
}

/**
 * Реле аудио-потока: ТОЛЬКО пересылка сэмплов на главный поток.
 * Батч 1024 сэмпла (~21 мс при 48 кГц); sampleOffset — абсолютный индекс
 * первого сэмпла батча (currentFrame-based). Никакого DSP здесь нет —
 * разбор ведёт ClapTracker на главном потоке (тот же код, что в тестах).
 */
const CLAP_RELAY_SRC = `
class ClapRelayProcessor extends AudioWorkletProcessor {
  constructor() { super(); this._buf = new Float32Array(1024); this._n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) this._buf[this._n++] = ch[i];
      if (this._n >= this._buf.length) this._flush(currentFrame + ch.length);
    }
    return true;
  }
  _flush(endFrame) {
    this.port.postMessage({
      frames: this._buf.slice(0, this._n),
      sampleOffset: endFrame - this._n,
    });
    this._n = 0;
  }
}
registerProcessor('clap-relay', ClapRelayProcessor);
`;

/**
 * Обвязка AudioWorkletNode. Создаёт реле в аудио-потоке и кормит им
 * ClapTracker; каждый хлопок уходит в onClap({t, энергия, индекс, тип}).
 *
 * @param {Object} options
 * @param {BaseAudioContext} options.audioContext  живой контекст (его sampleRate и audioWorklet)
 * @param {AudioNode} [options.sourceNode]  источник (например, MediaStreamAudioSourceNode микрофона)
 * @param {Function} options.onClap  событие {t, энергия, индекс, тип, ...}
 * @param {Function} [options.onError]  ошибки приема блоков (не ломают поток)
 * @returns {Promise<{ok:true,node,start,stop,tracker}|{ok:false,причина,node:null,start,stop}>}
 *   ok:false — честный отказ без имитации (start/stop — безопасные no-op).
 */
async function createClapDetector(options = {}) {
  const fail = (причина) => ({
    ok: false, причина, node: null,
    start: async () => {},   // честные no-op: имитации детекции нет
    stop: () => {},
  });
  if (typeof AudioWorkletNode === 'undefined') {
    return fail('AudioWorklet недоступен в этой среде — детектор хлопков не работает; имитации нет.');
  }
  const ctx = options.audioContext;
  if (!ctx || !ctx.audioWorklet || typeof ctx.audioWorklet.addModule !== 'function') {
    return fail('Нужен живой AudioContext с audioWorklet — детектор не запущен; имитации нет.');
  }
  if (typeof options.onClap !== 'function') {
    return fail('Нужен колбэк onClap({t, энергия, индекс, тип}) — детектор не запущен.');
  }
  try {
    const blobUrl = URL.createObjectURL(new Blob([CLAP_RELAY_SRC], { type: 'text/javascript' }));
    await ctx.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);

    const node = new AudioWorkletNode(ctx, 'clap-relay', {
      numberOfOutputs: 1, outputChannelCount: [1],
    });
    const mute = ctx.createGain(); // немой сток: граф тянется, в выход звук не идёт
    mute.gain.value = 0;
    node.connect(mute);
    mute.connect(ctx.destination);
    if (options.sourceNode) options.sourceNode.connect(node);

    const tracker = new ClapTracker({ sampleRate: ctx.sampleRate, onClap: options.onClap });
    node.port.onmessage = (msg) => {
      try {
        const d = msg.data || {};
        if (d.frames) tracker.feed(d.frames, { sampleOffset: d.sampleOffset });
      } catch (e) { if (typeof options.onError === 'function') options.onError(e); }
    };

    return {
      ok: true,
      node,
      tracker,
      start() {
        tracker.reset(); // stop сбрасывает; start начинает с чистого состояния
        try { node.connect(mute); mute.connect(ctx.destination); } catch (e) { /* уже подключены */ }
        try {
          const pr = ctx.resume();
          if (pr && typeof pr.catch === 'function') pr.catch(() => {});
        } catch (e) { /* состояние контекста ведёт владелец */ }
      },
      stop() {
        // стоп = честный сброс: история/рефрактерность/счётчик — с нуля
        tracker.reset();
        try { node.port.onmessage = null; } catch (e) {}
        try { node.disconnect(); } catch (e) {}
        try { mute.disconnect(); } catch (e) {}
      },
    };
  } catch (e) {
    return fail('AudioWorklet не поднялся: ' + (e && e.message ? e.message : String(e)));
  }
}

export {
  ClapTracker,
  detectClaps,
  createClapDetector,
  CLAP_PARAMS,
};
