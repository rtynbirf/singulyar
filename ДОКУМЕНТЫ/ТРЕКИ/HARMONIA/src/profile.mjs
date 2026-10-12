/**
 * ГАРМОНИЯ · core/profile — профиль доступности (Фаза 1)
 * ------------------------------------------------------------------
 * Оси по 04_PROFILE_SPEC.md (harm-profile/0.1). Пресеты лишь заполняют оси и
 * никогда не передаются событию. Ярлыков нейротипа и диагнозов в профиле нет
 * и появиться не могут — событие получает только производные значения осей
 * (правило 1 и F10). Профиль живёт на устройстве: localStorage с честным
 * запасным хранилищем в памяти ( офлайн, 0 сети ).
 *
 * Правило 3 спецификации: значение за пределами диапазона заменяется
 * ближайшим допустимым (для перечислений — значением по умолчанию).
 *
 * Ноль зависимостей, чистая логика — проверяется в node:test.
 */

const SCHEMA = 'harm-profile/0.1';
const STORE_KEY = 'harmonia.profile.v1';

/** Диапазоны и перечисления осей (04_PROFILE_SPEC.md, таблица). */
const AXES = {
  motion: ['full', 'soft', 'none'],
  gran: ['letter', 'syllable', 'word', 'line'],
  size: [1.0, 2.0],
  contrast: ['normal', 'high'],
  tempo: [0.5, 1.5],
  sound: [0, 1],
  haptic: [0, 1],
  offset: [-300, 300],
  input: ['touch', 'keyboard', 'voice', 'clap', 'switch'],
  output: ['visual', 'audio', 'haptic', 'braille'],
};

const NUMBER_AXES = new Set(['size', 'tempo', 'sound', 'haptic', 'offset']);

/** Автоначальные значения из системных настроек (F8) + defaults спецификации. */
function defaultsFor(env = {}) {
  return {
    motion: env.prefersReducedMotion ? 'none' : 'soft',
    gran: 'syllable',
    size: 1.0,
    contrast: env.prefersContrast ? 'high' : 'normal',
    tempo: 1.0,
    sound: 0.7,
    haptic: 0.5,
    offset: 0,
    input: 'touch',
    output: ['visual', 'audio'], // минимум два канала
  };
}

/** Мини-пресеты спецификации (без медицинских терминов, правило 5). */
const PRESETS = {
  'Минимум стимулов': { motion: 'none', haptic: 0, sound: 0.4, contrast: 'high' },
  'Читаю медленно': { gran: 'word', tempo: 0.7, size: 1.4 },
  'Только текст и вибро': { sound: 0, haptic: 0.8, output: ['haptic', 'visual'] },
};

/** Запасное хранилище в памяти — когда localStorage недоступен (тесты, приватный режим). */
class MemoryStore {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
}

function defaultStore() {
  try {
    if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  } catch (e) { /* доступ к хранилищу запрещён — честно уходим в память */ }
  return new MemoryStore();
}

class Profile {
  /**
   * @param {Object} [env]  {prefersReducedMotion?:boolean, prefersContrast?:boolean}
   * @param {Storage-like} [store]
   */
  constructor(env = Profile.detectEnv(), store = defaultStore()) {
    this._env = { ...env };
    this._store = store || new MemoryStore();
    this._axes = defaultsFor(this._env);
  }

  /** Автонастройка из matchMedia браузера; вне браузера — тихо пусто. */
  static detectEnv() {
    const env = { prefersReducedMotion: false, prefersContrast: false };
    try {
      const mm = globalThis.matchMedia;
      if (typeof mm === 'function') {
        env.prefersReducedMotion = mm('(prefers-reduced-motion: reduce)').matches === true;
        env.prefersContrast = (mm('(prefers-contrast: more)').matches === true)
          || (mm('(prefers-contrast: custom)').matches === true);
      }
    } catch (e) { /* без matchMedia — дефолты спецификации */ }
    return env;
  }

  get(axis) {
    const v = this._axes[axis];
    return Array.isArray(v) ? v.slice() : v;
  }

  set(axis, value) {
    if (!(axis in AXES)) throw new TypeError(`Profile: неизвестная ось «${axis}»`);
    if (axis === 'output') return this._setOutput(value);
    const allowed = AXES[axis];
    if (NUMBER_AXES.has(axis)) {
      const [min, max] = allowed;
      const num = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
      if (!Number.isFinite(num)) {
        this._axes[axis] = defaultsFor(this._env)[axis];
      } else {
        this._axes[axis] = Math.min(max, Math.max(min, num));
      }
    } else {
      this._axes[axis] = allowed.includes(value) ? value : defaultsFor(this._env)[axis];
    }
    return this._axes[axis];
  }

  _setOutput(value) {
    const allowed = AXES.output;
    const raw = Array.isArray(value) ? value : (value == null ? [] : String(value).split('+'));
    const clean = [];
    for (const item of raw) {
      const s = String(item).trim().toLowerCase();
      if (allowed.includes(s) && !clean.includes(s)) clean.push(s);
    }
    if (clean.length < 2) {
      // Спецификация: минимум два канала вывода. Меньше двух допустимых значений —
      // значение вне диапазона → заменяется значением по умолчанию (правило 3).
      clean.length = 0;
      clean.push(...defaultsFor(this._env).output);
    }
    clean.sort((a, b) => allowed.indexOf(a) - allowed.indexOf(b));
    this._axes.output = clean;
    return this.get('output');
  }

  /** Применить набор значений (импорт, пресет, панель). */
  apply(values = {}) {
    for (const key of Object.keys(values)) {
      if (key in AXES) this.set(key, values[key]);
    }
    return this.axes();
  }

  preset(name) {
    const p = PRESETS[name];
    if (!p) throw new TypeError(`Profile: неизвестный пресет «${name}»`);
    return this.apply(p);
  }

  axes() {
    const out = {};
    for (const key of Object.keys(AXES)) {
      const v = this._axes[key];
      out[key] = Array.isArray(v) ? v.slice() : v;
    }
    return out;
  }

  /**
   * Производные значения для события (F10): ТОЛЬКО оси. Ни ярлыков, ни причин,
   * ни пресетов — их в объекте профиля физически нет.
   */
  derived() { return this.axes(); }

  /** Экспорт по правилу 2 спецификации: {"schema":"harm-profile/0.1","profile":{...}} */
  export() {
    const profile = {};
    for (const key of Object.keys(AXES)) profile[key] = this._axes[key];
    return JSON.stringify({ schema: SCHEMA, profile }, null, 2) + '\n';
  }

  /**
   * Импорт: проверяет тег схемы и диапазоны (правило 2). Значения вне диапазона
   * зажимаются к ближайшим допустимым; неизвестные оси игнорируются.
   * Чужой тег схемы / не-JSON — TypeError.
   */
  static import(json, env = {}, store) {
    let obj;
    try {
      obj = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e) {
      throw new TypeError('Profile.import: файл не является JSON');
    }
    if (!obj || typeof obj !== 'object' || obj.schema !== SCHEMA || !obj.profile || typeof obj.profile !== 'object') {
      throw new TypeError(`Profile.import: ожидался тег схемы «${SCHEMA}» и объект profile`);
    }
    const p = new Profile(env, store);
    p.apply(obj.profile);
    return p;
  }

  save() { this._store.setItem(STORE_KEY, this.export()); }

  /** Загрузить с устройства; битый/чужой файл → свежий профиль без падения. */
  static load(env = {}, store = defaultStore()) {
    let raw = null;
    try { raw = store.getItem(STORE_KEY); } catch (e) { /* хранилище недоступно */ }
    if (!raw) return new Profile(env, store);
    try { return Profile.import(raw, env, store); } catch (e) { return new Profile(env, store); }
  }

  clear() { try { this._store.removeItem(STORE_KEY); } catch (e) { /* не критично */ } }
}

export { Profile, AXES, PRESETS, SCHEMA, STORE_KEY, MemoryStore, defaultsFor };
