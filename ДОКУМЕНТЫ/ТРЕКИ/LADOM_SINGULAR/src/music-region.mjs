// music-region.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.80 «ХВОСТЫ», строка Л4 «P2.1: Web Audio / AudioWorklet».
//
// КРИТЕРИЙ СТРОКИ: «луп живёт в такте без сети».
//
// Двухслойная конструкция (как требует строка карты):
//   1) ЧИСТАЯ ЧАСТЬ (тестируется в node без AudioContext):
//      buildPattern({seed}) — детерминированный паттерн одного такта 4/4 (16 шестнадцатых)
//      из минорной пентатоники; seed — строка (например, id сцены корпуса QA).
//      buildSchedule / metronomeSchedule / patternDurationSec — время в секундах.
//   2) АУДИО-ОБВЯЗКА (браузер): createMusicLoop — планировщик «lookahead» на реальных
//      AudioContext-часах; звук — ТОЛЬКО осцилляторы (никаких аудиофайлов и сети).
//      НЕТ AudioContext → createMusicLoop возвращает {available:false} — честный отказ,
//      имитации звука нет.
//
// Детерминизм: один seed → один паттерн (FNV-1a → mulberry32); паттерн длиной ровно такт.
// Метроном — опция; громкость/темп меняются на лету; stop() останавливает всё.

export const STEPS_PER_BAR = 16;      // 4/4 по шестнадцатым
export const PENTATONIC = [0, 3, 5, 7, 10]; // минорная пентатоника (полутоновые ступени)
export const ROOT_MIDI = 57;          // A3 — тоника

// --- детерминированный сид: FNV-1a 32 бита (та же функция, что в тестовой фикстуре intent-seed; модуль самодостаточен) ---
export function hashSeed(str) {
  let h = 0x811c9dc5;
  const bytes = new TextEncoder().encode(String(str));
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — детерминированный PRNG из 32-битного числа. */
export function mulberry32(seedNum) {
  let a = seedNum >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Паттерн одного такта 4/4 (ЧИСТАЯ функция — никакого AudioContext).
 * @param {object} o
 * @param {string|number} o.seed    сид региона (id music-региона — хороший сид)
 * @param {number} [o.steps=16]     шагов в такте (по умолчанию 16 шестнадцатых)
 * @param {number} [o.density=0.45] вероятность мелодической ноты на чётном шаге (0..1)
 * @returns {{seed, steps, root, meter:'4/4', scale, events:Array<{step,midi,dur,vel,voice}>}}
 */
export function buildPattern({ seed, steps = STEPS_PER_BAR, density = 0.45 } = {}) {
  if (steps < 4 || steps % 4 !== 0) throw new Error('steps должен быть кратен 4 (такт 4/4)');
  const rng = mulberry32(hashSeed(String(seed)));
  const events = [];
  // бас: на каждой доле — устойчивая ступень пентатоники (тоника/квинта/октава вниз)
  const bassChoices = [0, 0, 7, -12];
  for (let step = 0; step < steps; step += 4) {
    const midi = ROOT_MIDI + bassChoices[Math.floor(rng() * bassChoices.length)];
    events.push({ step, midi, dur: 2, vel: 0.9, voice: 'bass' });
  }
  // лид: пентатоника, только чётные шаги (восьмые) — воздух в паттерне
  for (let step = 0; step < steps; step += 2) {
    if (rng() < density) {
      const degree = PENTATONIC[Math.floor(rng() * PENTATONIC.length)];
      const octave = rng() < 0.25 ? 12 : 0;
      events.push({
        step,
        midi: ROOT_MIDI + degree + octave,
        dur: rng() < 0.3 ? 2 : 1,
        vel: 0.5 + Math.round(rng() * 30) / 100,
        voice: 'lead',
      });
    }
  }
  events.sort((a, b) => a.step - b.step || (a.voice === 'bass' ? -1 : 1));
  return {
    seed: String(seed),
    steps,
    root: ROOT_MIDI,
    meter: '4/4',
    scale: 'pentatonic-minor',
    events,
  };
}

/** Длительность паттерна в секундах. */
export function patternDurationSec(pattern, { bpm = 96 } = {}) {
  const stepSec = 60 / bpm / 4;
  return pattern.steps * stepSec;
}

/**
 * Расписание нот в секундах (ЧИСТАЯ функция).
 * @returns {Array<{time,freq,dur,vel,voice}>} time относительно `when`
 */
export function buildSchedule(pattern, { bpm = 96, when = 0, loops = 1 } = {}) {
  const stepSec = 60 / bpm / 4;
  const out = [];
  for (let loop = 0; loop < loops; loop++) {
    const offset = when + loop * patternDurationSec(pattern, { bpm });
    for (const ev of pattern.events) {
      out.push({
        time: offset + ev.step * stepSec,
        freq: midiToFreq(ev.midi),
        dur: ev.dur * stepSec,
        vel: ev.vel,
        voice: ev.voice,
      });
    }
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

/** Расписание кликов метронома: один клик на долю (step % 4 === 0), акцент на первой. */
export function metronomeSchedule(pattern, { bpm = 96, when = 0, loops = 1 } = {}) {
  const stepSec = 60 / bpm / 4;
  const out = [];
  for (let loop = 0; loop < loops; loop++) {
    const offset = when + loop * patternDurationSec(pattern, { bpm });
    for (let step = 0; step < pattern.steps; step += 4) {
      out.push({ time: offset + step * stepSec, accent: step === 0 });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Аудио-обвязка (браузер). Честный фолбэк: нет AudioContext — дорожка недоступна.
// ---------------------------------------------------------------------------
const LOOKAHEAD_SEC = 0.12;
const TICK_MS = 25;

export function isWebAudioAvailable() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  return typeof Ctx === 'function';
}

/**
 * MusicLoop на чистом Web Audio (осцилляторы; без файлов и сети).
 * В node (нет AudioContext) возвращает {available:false, reason} — БЕЗ имитации звука.
 */
export function createMusicLoop({ seed = 'ladom-loop', bpm = 96, volume = 0.8, metronome = false } = {}) {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof Ctx !== 'function') {
    return {
      available: false,
      reason: 'Web Audio API недоступна в этой среде — дорожка не запускается (честный отказ, без имитации).',
      start: async () => false,
      stop: () => false,
    };
  }

  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const pattern = buildPattern({ seed });
  let playing = false;
  let metroOn = !!metronome;
  let currentBpm = bpm;
  let nextLoopStart = 0;
  let timer = null;
  let scheduledUntil = 0;
  const liveNodes = new Set();

  function playNote(note, atTime) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.voice === 'bass' ? 'triangle' : 'square';
    osc.frequency.value = note.freq;
    const peak = note.voice === 'bass' ? 0.5 * note.vel : 0.22 * note.vel;
    gain.gain.setValueAtTime(0, atTime);
    gain.gain.linearRampToValueAtTime(peak, atTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + Math.max(0.05, note.dur * 0.9));
    osc.connect(gain).connect(master);
    osc.start(atTime);
    osc.stop(atTime + Math.max(0.06, note.dur));
    liveNodes.add(osc);
    osc.onended = () => liveNodes.delete(osc);
  }

  function playClick(atTime, accent) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1600 : 1050;
    gain.gain.setValueAtTime(accent ? 0.25 : 0.15, atTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.03);
    osc.connect(gain).connect(master);
    osc.start(atTime);
    osc.stop(atTime + 0.035);
    liveNodes.add(osc);
    osc.onended = () => liveNodes.delete(osc);
  }

  function tick() {
    if (!playing) return;
    const horizon = ctx.currentTime + LOOKAHEAD_SEC;
    while (scheduledUntil < horizon) {
      const loopStart = scheduledUntil <= ctx.currentTime ? ctx.currentTime + 0.02 : scheduledUntil;
      for (const note of buildSchedule(pattern, { bpm: currentBpm, when: loopStart })) {
        playNote(note, note.time);
      }
      if (metroOn) {
        for (const click of metronomeSchedule(pattern, { bpm: currentBpm, when: loopStart })) {
          playClick(click.time, click.accent);
        }
      }
      scheduledUntil = loopStart + patternDurationSec(pattern, { bpm: currentBpm });
    }
  }

  return {
    available: true,
    pattern,
    get playing() { return playing; },
    async start() {
      if (playing) return true;
      if (ctx.state === 'suspended') await ctx.resume();
      playing = true;
      scheduledUntil = ctx.currentTime;
      nextLoopStart = ctx.currentTime;
      tick();
      timer = setInterval(tick, TICK_MS);
      return true;
    },
    stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      for (const node of [...liveNodes]) {
        try { node.stop(); } catch { /* уже остановлен */ }
      }
      liveNodes.clear();
      return true;
    },
    setVolume(v) { master.gain.value = Math.min(1, Math.max(0, +v || 0)); },
    setBpm(b) { currentBpm = Math.min(240, Math.max(30, +b || 96)); },
    setMetronome(flag) { metroOn = !!flag; },
    dispose() {
      this.stop();
      try { ctx.close(); } catch { /* уже закрыт */ }
    },
  };
}
